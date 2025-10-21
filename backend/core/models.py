"""
Models for the Terminplaner application.
Migrated from Supabase schema.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('Users must have an email address')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class FederalState(models.Model):
    """Austrian federal states (Bundesländer)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'federal_states'
        ordering = ['sort_order', 'name']
        verbose_name = 'Federal State'
        verbose_name_plural = 'Federal States'

    def __str__(self):
        return self.name


class Region(models.Model):
    """Service regions within federal states."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    federal_state = models.ForeignKey(
        FederalState,
        on_delete=models.CASCADE,
        related_name='regions'
    )
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'regions'
        ordering = ['federal_state__sort_order', 'sort_order', 'name']
        verbose_name = 'Region'
        verbose_name_plural = 'Regions'

    def __str__(self):
        return f"{self.name} ({self.federal_state.name})"


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model with role-based access control.
    Replaces Supabase Auth + profiles table.
    """

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'profiles'
        ordering = ['region__sort_order', 'sort_order', 'full_name']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == 'admin'


class Client(models.Model):
    """Care recipients."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        ordering = ['last_name', 'first_name']
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        """Return full name of client."""
        return f"{self.first_name} {self.last_name}"


class Shift(models.Model):
    """Individual work shifts."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shifts'
    )
    shift_date = models.DateField()
    time_from = models.TimeField()
    time_to = models.TimeField()
    client_name = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_shifts'
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shifts'
    )
    seeking_replacement = models.BooleanField(default=False)
    original_employee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='original_shifts'
    )
    open_shift = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shifts'
        ordering = ['shift_date', 'time_from']
        verbose_name = 'Shift'
        verbose_name_plural = 'Shifts'
        indexes = [
            models.Index(fields=['shift_date', 'employee']),
            models.Index(fields=['employee', 'shift_date']),
        ]

    def __str__(self):
        employee_name = self.employee.full_name if self.employee else 'Unassigned'
        return f"{employee_name} - {self.shift_date} {self.time_from}-{self.time_to}"


class WeeklyTemplate(models.Model):
    """Recurring shift templates."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='weekly_templates'
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'weekly_templates'
        ordering = ['employee__full_name', 'name']
        verbose_name = 'Weekly Template'
        verbose_name_plural = 'Weekly Templates'

    def __str__(self):
        return f"{self.employee.full_name} - {self.name}"


class TemplateShift(models.Model):
    """Shifts within a weekly template."""

    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        WeeklyTemplate,
        on_delete=models.CASCADE,
        related_name='template_shifts'
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    time_from = models.TimeField()
    time_to = models.TimeField()
    client_name = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'template_shifts'
        ordering = ['template', 'day_of_week', 'time_from']
        verbose_name = 'Template Shift'
        verbose_name_plural = 'Template Shifts'

    def __str__(self):
        return f"{self.template.name} - {self.get_day_of_week_display()} {self.time_from}-{self.time_to}"


class Absence(models.Model):
    """Employee time off/vacation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='absences'
    )
    start_date = models.DateField()
    start_time = models.TimeField(default='00:00:00')
    end_date = models.DateField()
    end_time = models.TimeField(default='23:59:59')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'absences'
        ordering = ['start_date', 'start_time']
        verbose_name = 'Absence'
        verbose_name_plural = 'Absences'
        indexes = [
            models.Index(fields=['employee', 'start_date']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.start_date} to {self.end_date}"
