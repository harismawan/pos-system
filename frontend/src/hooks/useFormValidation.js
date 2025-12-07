import { useState, useCallback } from "react";

/**
 * Validation rules configuration
 */
export const validators = {
  required: (value, fieldName = "This field") => {
    if (value === null || value === undefined || value === "") {
      return `${fieldName} is required`;
    }
    if (typeof value === "string" && !value.trim()) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  },

  minLength:
    (min) =>
    (value, fieldName = "This field") => {
      if (!value) return null;
      if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
      }
      return null;
    },

  maxLength:
    (max) =>
    (value, fieldName = "This field") => {
      if (!value) return null;
      if (value.length > max) {
        return `${fieldName} must be less than ${max} characters`;
      }
      return null;
    },

  min:
    (minValue) =>
    (value, fieldName = "This field") => {
      if (value === "" || value === null || value === undefined) return null;
      if (Number(value) < minValue) {
        return `${fieldName} must be at least ${minValue}`;
      }
      return null;
    },

  max:
    (maxValue) =>
    (value, fieldName = "This field") => {
      if (value === "" || value === null || value === undefined) return null;
      if (Number(value) > maxValue) {
        return `${fieldName} must be no more than ${maxValue}`;
      }
      return null;
    },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || "Invalid format";
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, "").length < 8) {
      return "Please enter a valid phone number";
    }
    return null;
  },
};

/**
 * Custom hook for form validation with immediate feedback
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} Form state and validation methods
 */
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validate a single field
  const validateField = useCallback(
    (name, value) => {
      const rules = validationRules[name];
      if (!rules) return null;

      for (const rule of rules) {
        const error =
          typeof rule === "function"
            ? rule(value, name)
            : rule.validator(value, rule.fieldName || name);
        if (error) return error;
      }
      return null;
    },
    [validationRules],
  );

  // Handle input change with immediate validation
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      setValues((prev) => ({ ...prev, [name]: newValue }));

      // Validate on change if field has been touched
      if (touched[name]) {
        const error = validateField(name, newValue);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField],
  );

  // Handle blur - validate and mark as touched
  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;

      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField],
  );

  // Set a specific field value programmatically
  const setValue = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField],
  );

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((name) => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {}),
    );

    return isValid;
  }, [values, validationRules, validateField]);

  // Reset form to initial values
  const reset = useCallback(
    (newValues = initialValues) => {
      setValues(newValues);
      setErrors({});
      setTouched({});
    },
    [initialValues],
  );

  // Check if form is valid
  const isValid = Object.keys(validationRules).every(
    (name) => !validateField(name, values[name]),
  );

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValue,
    setValues,
    validateAll,
    reset,
    isValid,
    // Helper to get field props
    getFieldProps: (name) => ({
      name,
      value: values[name] ?? "",
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    // Helper to get error for a field
    getError: (name) => (touched[name] ? errors[name] : null),
  };
}
