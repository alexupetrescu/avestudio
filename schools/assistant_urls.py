"""Session-authenticated, class-scoped endpoints for the Next.js assistant CMS."""

from django.urls import path

from . import assistant_views as views

app_name = 'assistant'

urlpatterns = [
    path('session/', views.session, name='session'),
    path('login/', views.sign_in, name='login'),
    path('logout/', views.sign_out, name='logout'),
    path('classes/', views.classes, name='classes'),
    path('classes/<uuid:class_id>/', views.class_detail, name='class'),
    path('classes/<uuid:class_id>/children/', views.add_child, name='add-child'),
    path('classes/<uuid:class_id>/children/<uuid:child_id>/', views.edit_child, name='child'),
    path('classes/<uuid:class_id>/children/<uuid:child_id>/photos/', views.child_photos, name='photos'),
    path('classes/<uuid:class_id>/children/<uuid:child_id>/reference/', views.reference_photo, name='reference'),
    path('classes/<uuid:class_id>/children/<uuid:child_id>/photos/<int:photo_id>/', views.photo_preview, name='photo-preview'),
    path('classes/<uuid:class_id>/children/<uuid:child_id>/reference/preview/', views.reference_preview, name='reference-preview'),
]
