from rest_framework import serializers
from portfolio.models import Category, PortfolioImage
from clients.models import ClientAlbum, AlbumImage, GoogleDriveAlbum

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

class GoogleDriveImageSerializer(serializers.Serializer):
    """Serializer for Google Drive image data."""
    id = serializers.CharField()
    name = serializers.CharField()
    mimeType = serializers.CharField()
    size = serializers.CharField(required=False, allow_null=True)
    createdTime = serializers.CharField(required=False, allow_null=True)
    modifiedTime = serializers.CharField(required=False, allow_null=True)
    thumbnailLink = serializers.CharField(required=False, allow_null=True)
    downloadLink = serializers.CharField()
    directLink = serializers.CharField()
    proxyLink = serializers.SerializerMethodField()
    thumbnailProxyLink = serializers.SerializerMethodField()
    
    def get_proxyLink(self, obj):
        """Generate proxy link for authenticated image access"""
        # Get the request from context to build absolute URL
        request = self.context.get('request') if hasattr(self, 'context') else None
        if request:
            return request.build_absolute_uri(f'/api/google-drive/image/{obj["id"]}/')
        # Fallback if no request context
        return f"/api/google-drive/image/{obj['id']}/"
    
    def get_thumbnailProxyLink(self, obj):
        """Generate proxy link for thumbnail"""
        request = self.context.get('request') if hasattr(self, 'context') else None
        if request:
            return request.build_absolute_uri(f'/api/google-drive/image/{obj["id"]}/?thumbnail=true')
        return f"/api/google-drive/image/{obj['id']}/?thumbnail=true"

class GoogleDriveAlbumSerializer(serializers.ModelSerializer):
    """Serializer for Google Drive Album with images from Drive."""
    images = GoogleDriveImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = GoogleDriveAlbum
        fields = ['id', 'title', 'folder_id', 'folder_link', 'created_at', 'images']