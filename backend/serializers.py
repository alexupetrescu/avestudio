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
    total_lei = serializers.FloatField(read_only=True)
    package_ids = serializers.ListField(child=serializers.CharField(max_length=64), required=False)

    class Meta:
        model = Child
        fields = ['id', 'first_name', 'last_name', 'package_a', 'package_b', 'package_c', 'package_d',
                  'package_e', 'package_ids', 'notes', 'total_lei']
        read_only_fields = ['id']

    def validate(self, attrs):
        first = attrs.get('first_name', getattr(self.instance, 'first_name', '')).strip()
        last = attrs.get('last_name', getattr(self.instance, 'last_name', '')).strip()
        if not first or not last:
            raise serializers.ValidationError('Completați numele și prenumele.')
        from schools.offers import default_package_ids, validate_package_ids
        from django.core.exceptions import ValidationError as ModelValidationError
        school_class = self.context.get('school_class') or (self.instance.school_class if self.instance else None)
        if self.instance is None and school_class and not any(key in attrs for key in ['package_ids', *[f'package_{letter}' for letter in 'abcde']]):
            attrs['package_ids'] = default_package_ids(school_class)
        if 'package_ids' in attrs:
            try:
                validate_package_ids(school_class, attrs['package_ids'], child=self.instance)
            except ModelValidationError as error:
                raise serializers.ValidationError(error.messages)
            # The ID selection is canonical; legacy flags cannot override it.
            for letter in 'abcde':
                attrs.pop(f'package_{letter}', None)
            pkg_a = pkg_b = False
        else:
            pkg_a = attrs.get('package_a', getattr(self.instance, 'package_a', False))

        if 'package_ids' not in attrs:
            pkg_b = attrs.get('package_b', getattr(self.instance, 'package_b', False))
        if pkg_a and pkg_b:
            raise serializers.ValidationError('Alegeți fie Pachetul Standard (A), fie Pachetul Extra (B), nu amândouă.')
        has_extra = any(attrs.get(f'package_{k}', getattr(self.instance, f'package_{k}', False)) for k in 'cde')
        if 'package_ids' not in attrs and has_extra and not (pkg_a or pkg_b):
            raise serializers.ValidationError('Extra C, D și E se comandă doar împreună cu Pachetul Standard (A) sau Extra (B).')
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


    def create(self, validated_data):
        from django.db import transaction
        from schools.offers import set_child_packages
        ids = validated_data.pop('package_ids', None)
        with transaction.atomic():
            child = super().create(validated_data)
            if ids is not None:
                set_child_packages(child, ids, require_base=True)
        return child

    def update(self, instance, validated_data):
        from django.db import transaction
        from schools.offers import set_child_packages
        ids = validated_data.pop('package_ids', None)
        with transaction.atomic():
            # Re-read under a row lock so a names-only edit cannot restore stale package flags.
            instance = Child.objects.select_for_update().get(pk=instance.pk)
            child = super().update(instance, validated_data)
            if ids is not None:
                set_child_packages(child, ids, require_base=True)
        return child


class SchoolClassOrderSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    is_returning = serializers.BooleanField(source='school.is_returning_customer', read_only=True)
    prices = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    shoot_display = serializers.CharField(read_only=True)
    session_label = serializers.CharField(read_only=True)
    children = ChildOrderSerializer(many=True, read_only=True)
    offers = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'teacher_name', 'school_name', 'is_returning', 'prices', 'period',
                  'shoot_date', 'shoot_time', 'shoot_display', 'session_label', 'offers', 'children']

    def get_prices(self, obj):
        return obj.prices

    def get_period(self, obj):
        from schools.offers import offer_period
        return offer_period(obj)

    def get_offers(self, obj):
        from schools.offers import catalog_data
        return catalog_data(obj)


class ClassPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassPhoto
        fields = ['id', 'image', 'web', 'thumb', 'width', 'height', 'created_at']


class ChildAlbumSerializer(serializers.ModelSerializer):
    photos = serializers.SerializerMethodField()
    sessions = serializers.SerializerMethodField()
    selected_session_id = serializers.UUIDField(source='id', read_only=True)
    session_label = serializers.CharField(source='school_class.session_label', read_only=True)
    class_name = serializers.CharField(source='school_class.name', read_only=True)
    school_name = serializers.CharField(source='school_class.school.name', read_only=True)
    packages = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Child
        fields = ['id', 'first_name', 'last_name', 'full_name', 'class_name', 'school_name',
                  'package_a', 'package_b', 'package_c', 'package_d', 'package_e', 'packages', 'photos',
                  'sessions', 'selected_session_id', 'session_label']

    def get_photos(self, obj):
        return ClassPhotoSerializer(
            obj.photos.filter(school_class_id=obj.school_class_id), many=True, context=self.context,
        ).data

    def get_sessions(self, obj):
        from schools.sessions import album_enrollments
        return [{
            'id': str(row.pk),
            'label': row.school_class.session_label,
            'year': row.school_class.session.year if row.school_class.session_id else row.school_class.school.season,
            'class_name': row.school_class.name,
            'school_name': row.school_class.school.name,
            'photo_count': row.photo_count,
        } for row in album_enrollments(obj)]
