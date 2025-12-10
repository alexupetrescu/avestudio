from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from .models import ClientAlbum
from backend.serializers import ClientAlbumSerializer

class ClientAlbumViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClientAlbum.objects.all()
    serializer_class = ClientAlbumSerializer

@api_view(['POST'])
@authentication_classes([])  # <--- This tells Django: "Don't check for cookies/users here"
@permission_classes([AllowAny])
def verify_pin(request):
    pin = request.data.get('pin')
    album_id = request.data.get('album_id')
    
    if not pin:
        return Response({'error': 'PIN is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not album_id:
        return Response({'error': 'Album ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        album = ClientAlbum.objects.get(id=album_id, pin=pin)
        return Response({'album_id': str(album.id), 'valid': True})
    except ClientAlbum.DoesNotExist:
        return Response({'error': 'Invalid PIN for this album'}, status=status.HTTP_400_BAD_REQUEST)
