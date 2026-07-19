from django.contrib import admin
from django.db.models import Count
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Category, PortfolioImage, SiteSettings


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'image_count')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'slug')

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_image_count=Count('images'))

    def image_count(self, obj):
        return obj._image_count
    image_count.short_description = 'Images'
    image_count.admin_order_field = '_image_count'


@admin.register(PortfolioImage)
class PortfolioImageAdmin(admin.ModelAdmin):
    list_display = ('thumbnail', 'title', 'category', 'sort_order', 'created_at')
    list_editable = ('sort_order',)
    list_filter = ('category', 'created_at')
    search_fields = ('title', 'description')
    list_select_related = ('category',)
    list_per_page = 50
    readonly_fields = ('image_preview', 'created_at')
    fields = ('title', 'category', 'image', 'image_preview', 'sort_order', 'description', 'created_at')

    def thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" class="ave-thumb ave-thumb-sm" loading="lazy" alt="" />',
                obj.image.url
            )
        return "No image"
    thumbnail.short_description = "Preview"

    def image_preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" class="ave-preview" alt="" />', obj.image.url)
        return "No image"
    image_preview.short_description = "Preview"


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fields = ('hero_image', 'hero_preview', 'hero_image_mobile', 'hero_mobile_preview', 'updated_at')
    readonly_fields = ('hero_preview', 'hero_mobile_preview', 'updated_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        # Singleton: skip the changelist and open the edit form directly
        settings_obj = SiteSettings.load()
        return redirect(reverse('admin:portfolio_sitesettings_change', args=[settings_obj.pk]))

    def hero_preview(self, obj):
        if obj and obj.hero_image:
            return format_html('<img src="{}" class="ave-preview" alt="" />', obj.hero_image.url)
        return mark_safe('<span class="ave-muted">Using the default image bundled with the frontend.</span>')
    hero_preview.short_description = 'Current desktop hero'

    def hero_mobile_preview(self, obj):
        if obj and obj.hero_image_mobile:
            return format_html('<img src="{}" class="ave-preview" alt="" />', obj.hero_image_mobile.url)
        return mark_safe('<span class="ave-muted">Using the default image bundled with the frontend.</span>')
    hero_mobile_preview.short_description = 'Current mobile hero'
