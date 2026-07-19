from rest_framework import viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import PortfolioImage, Category, SiteSettings
from backend.serializers import PortfolioImageSerializer, CategorySerializer

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class PortfolioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PortfolioImage.objects.all()
    serializer_class = PortfolioImageSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = PortfolioImage.objects.all().order_by('sort_order', '-created_at')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def site_settings(request):
    """Public site-wide settings (hero images). Nulls mean: use frontend defaults."""
    obj = SiteSettings.objects.first()

    def absolute(image_field):
        if obj and image_field:
            return request.build_absolute_uri(image_field.url)
        return None

    return Response({
        'hero_image': absolute(obj.hero_image if obj else None),
        'hero_image_mobile': absolute(obj.hero_image_mobile if obj else None),
    })
