from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from portfolio.views import PortfolioViewSet, CategoryViewSet
from clients.views import ClientAlbumViewSet, GoogleDriveAlbumViewSet, verify_pin, download_album, proxy_google_drive_image
from backend.views import list_google_drive_images, get_google_drive_folder_info

router = DefaultRouter()
router.register(r'portfolio', PortfolioViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'albums', ClientAlbumViewSet)
router.register(r'drive-albums', GoogleDriveAlbumViewSet, basename='drive-album')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/verify-pin/', verify_pin, name='verify-pin'),
    path('api/verify-pin', verify_pin, name='verify-pin-no-slash'),
    path('api/download-album/', download_album, name='download-album'),
    path('api/download-album', download_album, name='download-album-no-slash'),
    path('api/google-drive/images/', list_google_drive_images, name='google-drive-images'),
    path('api/google-drive/folder-info/', get_google_drive_folder_info, name='google-drive-folder-info'),
    path('api/google-drive/image/<str:file_id>/', proxy_google_drive_image, name='google-drive-image-proxy'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
