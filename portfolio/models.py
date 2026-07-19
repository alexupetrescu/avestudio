from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class PortfolioImage(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='portfolio/')
    category = models.ForeignKey(Category, related_name='images', on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True, help_text="Short emotional description or moment")
    sort_order = models.PositiveIntegerField(
        default=0, db_index=True,
        help_text="Lower numbers appear first on the site. Images with the same number are sorted newest first."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return self.title


class SiteSettings(models.Model):
    """Singleton holding site-wide content editable from the admin (hero images, etc.)."""
    hero_image = models.ImageField(
        upload_to='site/', blank=True, null=True,
        help_text="Homepage hero image for desktop. Recommended: wide landscape, at least 1920px."
    )
    hero_image_mobile = models.ImageField(
        upload_to='site/', blank=True, null=True,
        help_text="Homepage hero image for mobile. Recommended: portrait orientation."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def save(self, *args, **kwargs):
        # Enforce a single row: every save writes to pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Site Settings"
