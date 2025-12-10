from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class PortfolioImage(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='portfolio/')
    category = models.ForeignKey(Category, related_name='images', on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True, help_text="Short emotional description or moment")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
