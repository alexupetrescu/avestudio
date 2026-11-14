"""Synthetic authorization checks against the captured AveStudio application."""

import json
from pathlib import Path
import time
from urllib.parse import parse_qs,urlencode,urlsplit
import uuid
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.test import Client,TestCase

from production_middleware import PHOTO_SALT,TTL,canonical_path,signed_url
from schools.models import School,SchoolClass,Child,ClassPhoto,PhotoMatch
from clients.models import ClientAlbum,AlbumImage


class PrivateDelivery(TestCase):
    @classmethod
    def setUpTestData(cls):
        school=School.objects.create(name="Synthetic school")
        cls.group=SchoolClass(id=uuid.UUID("10000000-0000-0000-0000-000000000001"),school=school,name="Test",pin="4321")
        SchoolClass.objects.bulk_create([cls.group])
        cls.child=Child(id=uuid.UUID("20000000-0000-0000-0000-000000000001"),school_class=cls.group,first_name="A",last_name="Test",match_key="a-test",pin="1234")
        cls.other=Child(id=uuid.UUID("20000000-0000-0000-0000-000000000002"),school_class=cls.group,first_name="B",last_name="Test",match_key="b-test",pin="5678")
        Child.objects.bulk_create([cls.child,cls.other])
        cls.photo=ClassPhoto(school_class=cls.group,image=f"schools/{cls.group.id}/orig/one.jpg",web=f"schools/{cls.group.id}/web/one.jpg",thumb=f"schools/{cls.group.id}/thumb/one.jpg")
        cls.second=ClassPhoto(school_class=cls.group,image=f"schools/{cls.group.id}/orig/two.jpg",web=f"schools/{cls.group.id}/web/two.jpg",thumb=f"schools/{cls.group.id}/thumb/two.jpg")
        ClassPhoto.objects.bulk_create([cls.photo,cls.second])
        PhotoMatch.objects.bulk_create([PhotoMatch(photo=cls.photo,child=cls.child),PhotoMatch(photo=cls.second,child=cls.other)])
        cls.album=ClientAlbum(id=uuid.UUID("30000000-0000-0000-0000-000000000001"),title="Synthetic album",pin="4321")
        cls.other_album=ClientAlbum(id=uuid.UUID("30000000-0000-0000-0000-000000000002"),title="Other synthetic album",pin="5678")
        ClientAlbum.objects.bulk_create([cls.album,cls.other_album])
        AlbumImage.objects.bulk_create([AlbumImage(album=cls.album,image="client_albums/one.jpg"),AlbumImage(album=cls.other_album,image="client_albums/two.jpg")])
        root=Path(settings.MEDIA_ROOT)
        for name in [cls.photo.image.name,cls.photo.web.name,cls.photo.thumb.name,cls.second.image.name,"client_albums/one.jpg","client_albums/two.jpg","portfolio/public.jpg","site/logo.png",f"schools/{cls.group.id}/refs/ref.jpg","qrcodes/qr.png"]:
            path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b"synthetic image bytes")

    def setUp(self):self.client=Client(HTTP_HOST=settings.PRIMARY_HOST,HTTP_X_FORWARDED_PROTO="https")

    def child_data(self):
        response=self.client.get(f"/api/schools/child/{self.child.id}/",{"pin":"1234"})
        self.assertEqual(response.status_code,200);return response.json()

    def unlock_legacy(self):
        response=self.client.post("/api/verify-pin/",json.dumps({"album_id":str(self.album.id),"pin":"4321"}),content_type="application/json")
        self.assertEqual(response.status_code,200);return response

    def test_unsigned_school_and_legacy_photos_are_denied(self):
        for path in (self.photo.image.name,self.photo.web.name,"client_albums/one.jpg"):
            self.assertEqual(self.client.get("/media/"+path).status_code,404)

    def test_correct_child_pin_returns_signed_links_only_for_its_photos(self):
        data=self.child_data();self.assertEqual([p["id"] for p in data["photos"]],[self.photo.id])
        for field in ("image","web","thumb"):
            url=data["photos"][0][field];self.assertIn("access=",url)
            response=self.client.get(url);self.assertEqual(response.status_code,200)
            self.assertTrue(response["X-Accel-Redirect"].startswith("/_private_media/schools/"));self.assertIn("no-store",response["Cache-Control"])

    def test_wrong_child_pin_cannot_issue_photo_links(self):
        response=self.client.get(f"/api/schools/child/{self.child.id}/",{"pin":"0000"})
        self.assertEqual(response.status_code,403);self.assertNotIn("access=",response.content.decode())

    def test_signature_cannot_be_moved_to_another_childs_photo(self):
        url=self.child_data()["photos"][0]["image"]
        self.assertEqual(self.client.get(url.replace("one.jpg","two.jpg")).status_code,404)

    def test_expired_signature_is_rejected_by_media_and_optimizer(self):
        before=time.time()-TTL-10
        with mock.patch("django.core.signing.time.time",return_value=before):url=signed_url("/media/"+self.photo.image.name)
        self.assertEqual(self.client.get(url).status_code,404)
        optimizer="/_next/image?"+urlencode({"url":url,"w":640,"q":75})
        self.assertEqual(self.client.get("/api/_runtime/image-authorization/",HTTP_X_ORIGINAL_URI=optimizer).status_code,403)

    def test_modified_and_duplicate_signatures_are_rejected(self):
        url=self.child_data()["photos"][0]["image"]
        self.assertEqual(self.client.get(url+"x").status_code,404)
        token=parse_qs(urlsplit(url).query)["access"][0]
        self.assertEqual(self.client.get(url+"&"+urlencode({"access":token})).status_code,404)

    def test_optimizer_rejects_unsigned_private_images_and_permits_signed_or_public_media(self):
        signed=self.child_data()["photos"][0]["thumb"]
        for image,status in (("/media/"+self.photo.thumb.name,403),(signed,200),("/media/portfolio/public.jpg",200),
                             ("http://127.0.0.1:9100/media/portfolio/public.jpg",403),("https://example.org/photo.jpg",403),
                             ("/api/albums/image.jpg",403),("/logo.png",200)):
            uri="/_next/image?"+urlencode({"url":image,"w":640,"q":75})
            self.assertEqual(self.client.get("/api/_runtime/image-authorization/",HTTP_X_ORIGINAL_URI=uri).status_code,status)

    def test_legacy_album_is_not_public_before_successful_pin_check(self):
        self.assertEqual(self.client.get(f"/api/albums/{self.album.id}/").status_code,404)
        self.assertEqual(self.client.get("/api/albums/").status_code,404)

    def test_legacy_pin_cookie_preserves_browser_flow_and_signed_photo_access(self):
        response=self.unlock_legacy();cookie=response.cookies["ave_album_"+str(self.album.id)]
        self.assertTrue(cookie["secure"]);self.assertTrue(cookie["httponly"]);self.assertEqual(cookie["samesite"],"Lax")
        response=self.client.get(f"/api/albums/{self.album.id}/");self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get(response.json()["images"][0]["image"]).status_code,200)

    def test_legacy_album_grant_does_not_unlock_another_album(self):
        self.unlock_legacy();self.assertEqual(self.client.get(f"/api/albums/{self.other_album.id}/").status_code,404)

    def test_wrong_legacy_pin_and_forged_cookie_cannot_unlock_album(self):
        response=self.client.post("/api/verify-pin/",json.dumps({"album_id":str(self.album.id),"pin":"0000"}),content_type="application/json")
        self.assertEqual(response.status_code,400);self.assertFalse(response.cookies)
        self.client.cookies["ave_album_"+str(self.album.id)]="forged"
        self.assertEqual(self.client.get(f"/api/albums/{self.album.id}/").status_code,404)

    def test_staff_can_access_private_files_but_public_qr_and_references_stay_denied(self):
        for path in ("qrcodes/qr.png",f"schools/{self.group.id}/refs/ref.jpg"):
            self.assertEqual(self.client.get("/media/"+path).status_code,404)
        user=get_user_model().objects.create_user(username="synthetic-admin",is_staff=True)
        self.client.force_login(user)
        self.assertEqual(self.client.get("/media/qrcodes/qr.png").status_code,200)

    def test_public_portfolio_is_available_without_pin(self):
        self.assertEqual(self.client.get("/media/portfolio/public.jpg").status_code,200)

    def test_traversal_and_media_symlinks_are_rejected(self):
        for value in ("../settings.py","portfolio/../settings.py","/absolute","portfolio//file.jpg","portfolio/\\file.jpg","bad\x00name"):
            with self.assertRaises(ValueError):canonical_path(value)
        root=Path(settings.MEDIA_ROOT);link=root/"portfolio/link.jpg"
        link.symlink_to("/etc/passwd")
        try:self.assertEqual(self.client.get("/media/portfolio/link.jpg").status_code,404)
        finally:link.unlink()

    def test_secure_settings_and_side_effect_gates(self):
        self.assertFalse(settings.DEBUG);self.assertTrue(settings.SESSION_COOKIE_SECURE);self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertFalse(settings.RUNTIME_EMAIL_ENABLED)
        self.assertIn(settings.EMAIL_BACKEND,("django.core.mail.backends.dummy.EmailBackend","django.core.mail.backends.locmem.EmailBackend"))
        for path in ("/api/checkout/start/","/api/payments/webhook/stripe/","/api/google-drive/images/"):
            self.assertEqual(self.client.post(path,b"{}",content_type="application/json").status_code,503)

    def test_internal_ssr_is_trusted_only_from_the_configured_project_network(self):
        response=self.client.get("/api/site-settings/",HTTP_HOST="backend:8000",REMOTE_ADDR="172.30.20.2",HTTP_X_FORWARDED_PROTO="http")
        self.assertEqual(response.status_code,200)
        response=self.client.get("/api/site-settings/",HTTP_HOST="backend:8000",REMOTE_ADDR="203.0.113.1")
        self.assertEqual(response.status_code,400)

