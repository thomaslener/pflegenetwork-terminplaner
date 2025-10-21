"""
Admin interface for the core app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, FederalState, Region, Client, Shift,
    WeeklyTemplate, TemplateShift, Absence
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""

    list_display = ['email', 'full_name', 'role', 'region', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'region']
    search_fields = ['email', 'full_name']
    ordering = ['region__sort_order', 'sort_order', 'full_name']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'role', 'region', 'sort_order')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'region', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login']


@admin.register(FederalState)
class FederalStateAdmin(admin.ModelAdmin):
    """Admin interface for FederalState model."""

    list_display = ['name', 'sort_order', 'created_at']
    search_fields = ['name']
    ordering = ['sort_order', 'name']


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    """Admin interface for Region model."""

    list_display = ['name', 'federal_state', 'sort_order', 'created_at']
    list_filter = ['federal_state']
    search_fields = ['name', 'description']
    ordering = ['federal_state__sort_order', 'sort_order', 'name']


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Admin interface for Client model."""

    list_display = ['last_name', 'first_name', 'created_at']
    search_fields = ['first_name', 'last_name']
    ordering = ['last_name', 'first_name']


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    """Admin interface for Shift model."""

    list_display = ['shift_date', 'employee', 'time_from', 'time_to', 'client_name', 'region', 'open_shift', 'seeking_replacement']
    list_filter = ['shift_date', 'region', 'open_shift', 'seeking_replacement']
    search_fields = ['client_name', 'employee__full_name', 'notes']
    ordering = ['-shift_date', 'time_from']
    date_hierarchy = 'shift_date'


@admin.register(WeeklyTemplate)
class WeeklyTemplateAdmin(admin.ModelAdmin):
    """Admin interface for WeeklyTemplate model."""

    list_display = ['name', 'employee', 'created_at']
    list_filter = ['employee']
    search_fields = ['name', 'employee__full_name']
    ordering = ['employee__full_name', 'name']


@admin.register(TemplateShift)
class TemplateShiftAdmin(admin.ModelAdmin):
    """Admin interface for TemplateShift model."""

    list_display = ['template', 'day_of_week', 'time_from', 'time_to', 'client_name']
    list_filter = ['day_of_week', 'template__employee']
    search_fields = ['template__name', 'client_name']
    ordering = ['template', 'day_of_week', 'time_from']


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    """Admin interface for Absence model."""

    list_display = ['employee', 'start_date', 'end_date', 'reason']
    list_filter = ['start_date', 'employee']
    search_fields = ['employee__full_name', 'reason']
    ordering = ['-start_date']
    date_hierarchy = 'start_date'
