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
        fields = ['id', 'title', 'image', 'width', 'height', 'category', 'description', 'created_at']

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

# ---------------------------------------------------------------------------
# Schools app
# ---------------------------------------------------------------------------
from schools import pricing as school_pricing
from schools.models import Child, ClassPhoto, SchoolClass


class ChildOrderSerializer(serializers.ModelSerializer):
    """Child row on the teacher order form."""
    total_lei = serializers.IntegerField(read_only=True)

    class Meta:
        model = Child
        fields = ['id', 'first_name', 'last_name', 'package_a', 'package_b', 'package_c', 'package_d',
                  'notes', 'total_lei']
        read_only_fields = ['id']

    def validate(self, attrs):
        first = attrs.get('first_name', getattr(self.instance, 'first_name', '')).strip()
        last = attrs.get('last_name', getattr(self.instance, 'last_name', '')).strip()
        if not first or not last:
            raise serializers.ValidationError('Completați numele și prenumele.')
        from schools.models import fold_name
        school_class = self.context.get('school_class')
        if school_class:
            key = fold_name(f"{last} {first}")
            clash = Child.objects.filter(school_class=school_class, match_key=key)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError('Acest copil este deja în listă.')
        return attrs


class SchoolClassOrderSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    is_returning = serializers.BooleanField(source='school.is_returning_customer', read_only=True)
    prices = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    shoot_display = serializers.CharField(read_only=True)
    children = ChildOrderSerializer(many=True, read_only=True)

    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'teacher_name', 'school_name', 'is_returning', 'prices', 'period',
                  'shoot_date', 'shoot_time', 'shoot_display', 'children']

    def get_prices(self, obj):
        return school_pricing.prices_for(obj.school.is_returning_customer)

    def get_period(self, obj):
        return school_pricing.PERIOD


class ClassPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassPhoto
        fields = ['id', 'image', 'web', 'thumb', 'width', 'height', 'created_at']


class ChildAlbumSerializer(serializers.ModelSerializer):
    photos = ClassPhotoSerializer(many=True, read_only=True)
    class_name = serializers.CharField(source='school_class.name', read_only=True)
    school_name = serializers.CharField(source='school_class.school.name', read_only=True)
    packages = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Child
        fields = ['id', 'first_name', 'last_name', 'full_name', 'class_name', 'school_name',
                  'package_a', 'package_b', 'package_c', 'package_d', 'packages', 'photos']
