from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from backend.sitemap import sitemaps
from portfolio.views import PortfolioViewSet, CategoryViewSet, site_settings
from clients.views import ClientAlbumViewSet, GoogleDriveAlbumViewSet, verify_pin, download_album, proxy_google_drive_image
from backend.views import list_google_drive_images, get_google_drive_folder_info
from schools import views as school_views

router = DefaultRouter()
router.register(r'portfolio', PortfolioViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'albums', ClientAlbumViewSet)
router.register(r'drive-albums', GoogleDriveAlbumViewSet, basename='drive-album')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('api/', include(router.urls)),
    path('api/site-settings/', site_settings, name='site-settings'),
    path('api/verify-pin/', verify_pin, name='verify-pin'),
    path('api/verify-pin', verify_pin, name='verify-pin-no-slash'),
    path('api/download-album/', download_album, name='download-album'),
    path('api/download-album', download_album, name='download-album-no-slash'),
    path('api/google-drive/images/', list_google_drive_images, name='google-drive-images'),
    path('api/google-drive/folder-info/', get_google_drive_folder_info, name='google-drive-folder-info'),
    path('api/google-drive/image/<str:file_id>/', proxy_google_drive_image, name='google-drive-image-proxy'),
    # Schools app (teacher order list + child albums)
    path('api/schools/prices/', school_views.offer_prices, name='schools-prices'),
    path('api/schools/offer.pdf', school_views.offer_pdf, name='schools-offer-pdf'),
    path('api/schools/class/<uuid:class_id>/verify-pin/', school_views.class_verify_pin, name='schools-class-verify-pin'),
    path('api/schools/class/<uuid:class_id>/', school_views.class_detail, name='schools-class-detail'),
    path('api/schools/class/<uuid:class_id>/list.pdf', school_views.class_list_pdf, name='schools-class-list-pdf'),
    path('api/schools/class/<uuid:class_id>/children/', school_views.class_add_child, name='schools-class-add-child'),
    path('api/schools/class/<uuid:class_id>/children/<uuid:child_id>/', school_views.class_child_detail, name='schools-class-child'),
    path('api/schools/child/verify-pin/', school_views.child_verify_pin, name='schools-child-verify-pin'),
    path('api/schools/child/download/', school_views.child_download, name='schools-child-download'),
    path('api/schools/child/<uuid:child_id>/', school_views.child_detail, name='schools-child-detail'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
