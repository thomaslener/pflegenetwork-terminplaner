"""
URL configuration for the core app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, CurrentUserView,
    FederalStateViewSet, RegionViewSet, UserViewSet,
    ClientViewSet, ShiftViewSet, WeeklyTemplateViewSet,
    TemplateShiftViewSet, AbsenceViewSet,
    CreateUserView, UpdateUserPasswordView
)

router = DefaultRouter()
router.register(r'federal-states', FederalStateViewSet, basename='federal-state')
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'profiles', UserViewSet, basename='profile')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'weekly-templates', WeeklyTemplateViewSet, basename='weekly-template')
router.register(r'template-shifts', TemplateShiftViewSet, basename='template-shift')
router.register(r'absences', AbsenceViewSet, basename='absence')

urlpatterns = [
    # Authentication
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),

    # Admin user management
    path('admin/create-user/', CreateUserView.as_view(), name='create_user'),
    path('admin/update-password/', UpdateUserPasswordView.as_view(), name='update_password'),

    # Router URLs
    path('', include(router.urls)),
]
