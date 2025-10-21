"""
Views for the core app REST API.
Implements RLS-equivalent filtering and permissions.
"""
from rest_framework import viewsets, status, permissions as drf_permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q
from datetime import datetime

from .models import (
    User, FederalState, Region, Client, Shift,
    WeeklyTemplate, TemplateShift, Absence
)
from .serializers import (
    UserSerializer, FederalStateSerializer, RegionSerializer,
    ClientSerializer, ShiftSerializer, WeeklyTemplateSerializer,
    TemplateShiftSerializer, AbsenceSerializer, CreateUserSerializer,
    UpdatePasswordSerializer
)
from .permissions import (
    IsAdmin, IsAdminOrReadOnly, IsAdminOrOwner,
    CanViewShift, CanManageShift, CanViewProfile
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that includes user profile data."""

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user profile data to response
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'region_id': str(self.user.region_id) if self.user.region_id else None,
        }

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user profile with tokens."""
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(APIView):
    """Get current user profile."""

    permission_classes = [drf_permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class FederalStateViewSet(viewsets.ModelViewSet):
    """ViewSet for FederalState model."""

    queryset = FederalState.objects.all()
    serializer_class = FederalStateSerializer
    permission_classes = [IsAdminOrReadOnly]


class RegionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Region model.
    Implements RLS: Admins see all, employees see their region.
    """

    serializer_class = RegionSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user

        # Admins can see all regions
        if user.role == 'admin':
            return Region.objects.all()

        # Employees see their region
        if user.region:
            return Region.objects.filter(id=user.region_id)

        return Region.objects.none()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model (profiles).
    Implements RLS: Admins see all, employees see colleagues in same region + own profile.
    """

    serializer_class = UserSerializer
    permission_classes = [CanViewProfile]

    def get_queryset(self):
        user = self.request.user

        # Admins can see all users
        if user.role == 'admin':
            return User.objects.all()

        # Employees see colleagues in same region + themselves
        if user.region:
            return User.objects.filter(
                Q(region=user.region) | Q(id=user.id)
            ).distinct()

        # Fallback: only own profile
        return User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        """Only admins can create users."""
        if self.request.user.role != 'admin':
            raise PermissionError("Only admins can create users.")
        serializer.save()

    def perform_update(self, serializer):
        """Check permissions for updating users."""
        if self.request.user.role != 'admin':
            # Employees can only update their own profile
            if serializer.instance != self.request.user:
                raise PermissionError("You can only update your own profile.")
        serializer.save()

    def perform_destroy(self, instance):
        """Only admins can delete users."""
        if self.request.user.role != 'admin':
            raise PermissionError("Only admins can delete users.")
        instance.delete()


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Client model.
    Admins can manage, employees can read.
    """

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrReadOnly]


class ShiftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Shift model.
    Implements complex RLS:
    - Admins see all
    - Employees see own + region + open + seeking replacement
    """

    serializer_class = ShiftSerializer
    permission_classes = [CanManageShift]

    def get_queryset(self):
        user = self.request.user

        # Admins can see all shifts
        if user.role == 'admin':
            queryset = Shift.objects.all()
        else:
            # Employees see:
            # - Their own shifts
            # - Shifts in their region
            # - Open shifts
            # - Shifts seeking replacement
            queryset = Shift.objects.filter(
                Q(employee=user) |
                Q(region=user.region) |
                Q(open_shift=True) |
                Q(seeking_replacement=True)
            ).distinct()

        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(shift_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(shift_date__lte=end_date)

        # Filter by employee if provided
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create shifts (for template application)."""
        shifts_data = request.data.get('shifts', [])

        if not shifts_data:
            return Response(
                {'error': 'No shifts provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shifts = []
        for shift_data in shifts_data:
            shift_data['created_by'] = request.user.id
            serializer = ShiftSerializer(data=shift_data, context={'request': request})
            if serializer.is_valid():
                shifts.append(serializer.save())
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            ShiftSerializer(shifts, many=True).data,
            status=status.HTTP_201_CREATED
        )


class WeeklyTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for WeeklyTemplate model.
    Admins see all, employees see only their own.
    """

    serializer_class = WeeklyTemplateSerializer
    permission_classes = [IsAdminOrOwner]

    def get_queryset(self):
        user = self.request.user

        # Admins can see all templates
        if user.role == 'admin':
            return WeeklyTemplate.objects.all()

        # Employees see only their own
        return WeeklyTemplate.objects.filter(employee=user)

    def perform_create(self, serializer):
        """Set employee to current user if not admin."""
        if self.request.user.role != 'admin':
            serializer.save(employee=self.request.user)
        else:
            serializer.save()


class TemplateShiftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TemplateShift model.
    Access controlled through template ownership.
    """

    serializer_class = TemplateShiftSerializer
    permission_classes = [IsAdminOrOwner]

    def get_queryset(self):
        user = self.request.user

        # Admins can see all template shifts
        if user.role == 'admin':
            queryset = TemplateShift.objects.all()
        else:
            # Employees see only their own template shifts
            queryset = TemplateShift.objects.filter(template__employee=user)

        # Filter by template if provided
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(template_id=template_id)

        return queryset


class AbsenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Absence model.
    Admins manage all, employees manage own + view all.
    """

    serializer_class = AbsenceSerializer
    permission_classes = [IsAdminOrOwner]

    def get_queryset(self):
        user = self.request.user

        # Everyone can see all absences (for planning)
        queryset = Absence.objects.all()

        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(end_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_date__lte=end_date)

        # Filter by employee if provided
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        return queryset

    def perform_create(self, serializer):
        """Set employee to current user if not admin."""
        if self.request.user.role != 'admin':
            serializer.save(employee=self.request.user)
        else:
            serializer.save()


class CreateUserView(APIView):
    """
    Create a new user (admin only).
    Replaces Supabase Edge Function: create-user
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'user': UserSerializer(result['user']).data,
                'temp_password': result['temp_password']
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateUserPasswordView(APIView):
    """
    Update user password (admin only).
    Replaces Supabase Edge Function: update-user-password
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = UpdatePasswordSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'user_id': str(result['user'].id),
                'temp_password': result['temp_password']
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
