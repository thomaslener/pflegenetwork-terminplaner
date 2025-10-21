"""
Custom permissions for the core app.
Replaces Supabase Row Level Security (RLS) policies.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow full access to admins, read-only to others."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrOwner(permissions.BasePermission):
    """
    Allow admins full access, employees can only access their own data.
    Replaces RLS policies for shifts, absences, templates.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.role == 'admin':
            return True

        # Employees can only access their own objects
        if hasattr(obj, 'employee'):
            return obj.employee == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user

        return False


class CanViewShift(permissions.BasePermission):
    """
    Special permission for shifts:
    - Admins can see all
    - Employees can see their own + shifts in same region + open shifts + seeking replacement
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins can access everything
        if user.role == 'admin':
            return True

        # Employee can see their own shifts
        if obj.employee == user:
            return True

        # Employee can see shifts in their region
        if obj.region and obj.region == user.region:
            return True

        # Employee can see open shifts
        if obj.open_shift:
            return True

        # Employee can see shifts seeking replacement
        if obj.seeking_replacement:
            return True

        return False


class CanManageShift(permissions.BasePermission):
    """
    Permission for managing shifts:
    - Admins can manage all
    - Employees can manage their own shifts + take over open/replacement shifts
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins can manage everything
        if user.role == 'admin':
            return True

        # For creation, always allow authenticated users
        if request.method == 'POST':
            return True

        # Employees can update/delete their own shifts
        if obj.employee == user:
            return True

        # Employees can take over open shifts or shifts seeking replacement
        if request.method in ['PUT', 'PATCH']:
            if obj.open_shift or obj.seeking_replacement:
                return True

        return False


class CanViewProfile(permissions.BasePermission):
    """
    Profile viewing permissions:
    - Admins can see all profiles
    - Employees can see colleagues in same region + their own profile
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins can access everything
        if user.role == 'admin':
            return True

        # Users can access their own profile
        if obj == user:
            return True

        # Employees can see colleagues in same region
        if user.region and obj.region == user.region:
            return True

        return False
