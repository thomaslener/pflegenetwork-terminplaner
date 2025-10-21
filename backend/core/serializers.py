"""
Serializers for the core app REST API.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, FederalState, Region, Client, Shift,
    WeeklyTemplate, TemplateShift, Absence
)


class FederalStateSerializer(serializers.ModelSerializer):
    """Serializer for FederalState model."""

    class Meta:
        model = FederalState
        fields = ['id', 'name', 'sort_order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegionSerializer(serializers.ModelSerializer):
    """Serializer for Region model."""

    federal_state_name = serializers.CharField(source='federal_state.name', read_only=True)

    class Meta:
        model = Region
        fields = [
            'id', 'name', 'description', 'federal_state', 'federal_state_name',
            'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (profiles)."""

    region_name = serializers.CharField(source='region.name', read_only=True)
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'region', 'region_name',
            'sort_order', 'is_active', 'password', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        """Create user with hashed password."""
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        """Update user, handling password separately."""
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Client
        fields = ['id', 'first_name', 'last_name', 'full_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShiftSerializer(serializers.ModelSerializer):
    """Serializer for Shift model."""

    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    original_employee_name = serializers.CharField(source='original_employee.full_name', read_only=True)
    region_name = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'employee', 'employee_name', 'shift_date', 'time_from', 'time_to',
            'client_name', 'notes', 'created_by', 'created_by_name', 'region',
            'region_name', 'seeking_replacement', 'original_employee',
            'original_employee_name', 'open_shift', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Set created_by to current user if not provided."""
        if 'created_by' not in validated_data:
            validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TemplateShiftSerializer(serializers.ModelSerializer):
    """Serializer for TemplateShift model."""

    class Meta:
        model = TemplateShift
        fields = [
            'id', 'template', 'day_of_week', 'time_from', 'time_to',
            'client_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WeeklyTemplateSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyTemplate model."""

    template_shifts = TemplateShiftSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = WeeklyTemplate
        fields = [
            'id', 'employee', 'employee_name', 'name',
            'template_shifts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AbsenceSerializer(serializers.ModelSerializer):
    """Serializer for Absence model."""

    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Absence
        fields = [
            'id', 'employee', 'employee_name', 'start_date', 'start_time',
            'end_date', 'end_time', 'reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateUserSerializer(serializers.Serializer):
    """Serializer for creating a new user (admin operation)."""

    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=['admin', 'employee'])
    region_id = serializers.UUIDField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(default=0)

    def validate_email(self, value):
        """Check that email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return value

    def create(self, validated_data):
        """Create user with temporary password."""
        import secrets
        import string

        # Generate temporary password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))

        # Create user
        region_id = validated_data.pop('region_id', None)
        user = User.objects.create(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            role=validated_data['role'],
            region_id=region_id,
            sort_order=validated_data.get('sort_order', 0)
        )
        user.set_password(temp_password)
        user.save()

        # Return user and temp password
        return {
            'user': user,
            'temp_password': temp_password
        }


class UpdatePasswordSerializer(serializers.Serializer):
    """Serializer for updating user password (admin operation)."""

    user_id = serializers.UUIDField()

    def validate_user_id(self, value):
        """Check that user exists."""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value

    def save(self):
        """Update user password."""
        import secrets
        import string

        # Generate new temporary password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))

        # Update password
        user = User.objects.get(id=self.validated_data['user_id'])
        user.set_password(temp_password)
        user.save()

        return {
            'user': user,
            'temp_password': temp_password
        }
