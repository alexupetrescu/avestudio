from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from .models import PortfolioImage, Category
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
        queryset = PortfolioImage.objects.all().order_by('-created_at')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset
