from rest_framework import serializers
from portfolio.models import Category, PortfolioImage
from clients.models import ClientAlbum, AlbumImage

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class PortfolioImageSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    
    class Meta:
        model = PortfolioImage
        fields = ['id', 'title', 'image', 'category', 'description', 'created_at']

class AlbumImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlbumImage
        fields = ['id', 'image', 'created_at']

class ClientAlbumSerializer(serializers.ModelSerializer):
    images = AlbumImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ClientAlbum
        fields = ['id', 'title', 'created_at', 'images']
