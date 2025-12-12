from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from portfolio.views import PortfolioViewSet, CategoryViewSet
from clients.views import ClientAlbumViewSet, verify_pin, download_album

router = DefaultRouter()
router.register(r'portfolio', PortfolioViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'albums', ClientAlbumViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/verify-pin/', verify_pin, name='verify-pin'),
    path('api/verify-pin', verify_pin, name='verify-pin-no-slash'),
    path('api/download-album/', download_album, name='download-album'),
    path('api/download-album', download_album, name='download-album-no-slash'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
