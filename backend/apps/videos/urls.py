from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (VideoViewSet, SubscriptionViewSet, LikeViewSet,
                   PlaylistViewSet, WatchHistoryViewSet)

router = DefaultRouter()
router.register(r'videos', VideoViewSet, basename='video')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'likes', LikeViewSet, basename='like')
router.register(r'playlists', PlaylistViewSet, basename='playlist')
router.register(r'watch-history', WatchHistoryViewSet, basename='watch-history')

urlpatterns = [
    path('', include(router.urls)),
]
