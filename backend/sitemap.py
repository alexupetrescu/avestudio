"""
Django sitemap generation for SEO
"""
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from portfolio.models import PortfolioImage, Category
from django.conf import settings


class StaticViewSitemap(Sitemap):
    """Sitemap for static pages"""
    priority = 1.0
    changefreq = 'daily'

    def items(self):
        return [
            'home',
            'portfolio',
        ]

    def location(self, item):
        return reverse(item)


class PortfolioSitemap(Sitemap):
    """Sitemap for portfolio images"""
    changefreq = 'weekly'
    priority = 0.8

    def items(self):
        return PortfolioImage.objects.all().order_by('-created_at')

    def lastmod(self, obj):
        return obj.created_at

    def location(self, obj):
        # If you have individual portfolio item pages, uncomment and adjust:
        # return f'/portfolio/{obj.id}'
        return '/portfolio'


class CategorySitemap(Sitemap):
    """Sitemap for portfolio categories"""
    changefreq = 'weekly'
    priority = 0.7

    def items(self):
        return Category.objects.all()

    def location(self, obj):
        return f'/portfolio?category={obj.slug}'


# Combine all sitemaps
sitemaps = {
    'static': StaticViewSitemap,
    'portfolio': PortfolioSitemap,
    'categories': CategorySitemap,
}

