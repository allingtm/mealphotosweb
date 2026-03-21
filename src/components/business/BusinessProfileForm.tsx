'use client';

import { type BusinessType, getBusinessTypeGroup } from '@/types/database';

interface BusinessProfileFormProps {
  businessType: BusinessType;
  data: BusinessFormData;
  onChange: (data: Partial<BusinessFormData>) => void;
  errors?: Record<string, string>;
}

export interface BusinessFormData {
  business_name: string;
  bio: string;
  phone: string;
  email: string;
  website_url: string;
  booking_url: string;
  address_line_1: string;
  address_line_2: string;
  address_city: string;
  address_postcode: string;
  address_country: string;
  menu_url: string;
  cuisine_types: string;
  delivery_available: boolean;
  qualifications: string;
  specialisms: string;
  accepts_clients: boolean;
  consultation_type: string[];
  service_area: string;
  class_types: string[];
  price_from: string;
}

export const defaultBusinessFormData: BusinessFormData = {
  business_name: '',
  bio: '',
  phone: '',
  email: '',
  website_url: '',
  booking_url: '',
  address_line_1: '',
  address_line_2: '',
  address_city: '',
  address_postcode: '',
  address_country: 'GB',
  menu_url: '',
  cuisine_types: '',
  delivery_available: false,
  qualifications: '',
  specialisms: '',
  accepts_clients: true,
  consultation_type: [],
  service_area: '',
  class_types: [],
  price_from: '',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  outline: 'none',
};

const labelStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 600 as const,
  color: 'var(--text-secondary)',
  marginBottom: 4,
};

function Field({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--status-error)' }}> *</span>}
      </span>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-body)' }}>
          {error}
        </span>
      )}
    </label>
  );
}

function PillSelect({ options, selected, onToggle, labels }: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  labels: Record<string, string>;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className="rounded-full transition-colors"
            style={{
              padding: '6px 16px',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              backgroundColor: isChecked ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: isChecked ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              border: isChecked ? 'none' : '1px solid var(--bg-elevated)',
              fontWeight: isChecked ? 600 : 400,
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default function BusinessProfileForm({
  businessType,
  data,
  onChange,
  errors = {},
}: BusinessProfileFormProps) {
  const group = getBusinessTypeGroup(businessType);
  const isFoodService = group === 'food_service';
  const isShopsRetail = group === 'shops_retail';
  const isChefsExperiences = group === 'chefs_experiences';
  const isHealthNutrition = group === 'health_nutrition';
  const isProduction = group === 'production';

  const showAddress = isFoodService || isShopsRetail || isProduction || businessType === 'other';
  const showCuisine = ['restaurant', 'cafe', 'pub', 'hotel_restaurant'].includes(businessType);
  const showDelivery = isShopsRetail || isProduction || ['takeaway', 'meal_prep_service'].includes(businessType);
  const showMenu = ['restaurant', 'cafe', 'pub', 'bakery', 'hotel_restaurant'].includes(businessType);

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((t) => t !== item) : [...arr, item];

  return (
    <div className="flex flex-col gap-4">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--text-primary)',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Set up your business profile
      </h2>

      {/* Common fields */}
      <Field label="Business name" required error={errors.business_name}>
        <input
          type="text"
          value={data.business_name}
          onChange={(e) => onChange({ business_name: e.target.value })}
          maxLength={100}
          placeholder="e.g. The Odd One Out"
          style={inputStyle}
        />
      </Field>

      <Field label="Bio" error={errors.bio}>
        <textarea
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Tell people about your business..."
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
      </Field>

      <Field label="Phone" error={errors.phone}>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          maxLength={20}
          placeholder="+44 1234 567890"
          style={inputStyle}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="hello@business.com"
          style={inputStyle}
        />
      </Field>

      <Field label="Website" error={errors.website_url}>
        <input
          type="url"
          value={data.website_url}
          onChange={(e) => onChange({ website_url: e.target.value })}
          placeholder="https://www.example.com"
          style={inputStyle}
        />
      </Field>

      {(isFoodService || isChefsExperiences) && (
        <Field label="Booking URL" error={errors.booking_url}>
          <input
            type="url"
            value={data.booking_url}
            onChange={(e) => onChange({ booking_url: e.target.value })}
            placeholder="https://booking.example.com"
            style={inputStyle}
          />
        </Field>
      )}

      {/* Address fields */}
      {showAddress && (
        <>
          <Field label="Address line 1">
            <input
              type="text"
              value={data.address_line_1}
              onChange={(e) => onChange({ address_line_1: e.target.value })}
              placeholder="123 High Street"
              style={inputStyle}
            />
          </Field>
          <Field label="Address line 2">
            <input
              type="text"
              value={data.address_line_2}
              onChange={(e) => onChange({ address_line_2: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input
                type="text"
                value={data.address_city}
                onChange={(e) => onChange({ address_city: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Postcode">
              <input
                type="text"
                value={data.address_postcode}
                onChange={(e) => onChange({ address_postcode: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>
        </>
      )}

      {/* Food Service specific */}
      {showCuisine && (
        <Field label="Cuisine types (comma-separated)">
          <input
            type="text"
            value={data.cuisine_types}
            onChange={(e) => onChange({ cuisine_types: e.target.value })}
            placeholder="British, Italian, Asian"
            style={inputStyle}
          />
        </Field>
      )}

      {showMenu && (
        <Field label="Menu URL">
          <input
            type="url"
            value={data.menu_url}
            onChange={(e) => onChange({ menu_url: e.target.value })}
            placeholder="https://menu.example.com"
            style={inputStyle}
          />
        </Field>
      )}

      {showDelivery && (
        <label className="flex items-center gap-3" style={{ padding: '8px 0' }}>
          <input
            type="checkbox"
            checked={data.delivery_available}
            onChange={(e) => onChange({ delivery_available: e.target.checked })}
            className="rounded"
            style={{ width: 20, height: 20, accentColor: 'var(--accent-primary)' }}
          />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)' }}>
            Delivery available
          </span>
        </label>
      )}

      {/* Chefs & Experiences specific */}
      {isChefsExperiences && (
        <>
          <Field label="Class types">
            <PillSelect
              options={['group', 'private', '1-to-1', 'corporate']}
              selected={data.class_types}
              onToggle={(val) => onChange({ class_types: toggleArrayItem(data.class_types, val) })}
              labels={{ group: 'Group', private: 'Private', '1-to-1': '1-to-1', corporate: 'Corporate' }}
            />
          </Field>

          <Field label="Price from (£)">
            <input
              type="number"
              value={data.price_from}
              onChange={(e) => onChange({ price_from: e.target.value })}
              placeholder="35"
              min="0"
              style={inputStyle}
            />
          </Field>

          <Field label="Service area">
            <input
              type="text"
              value={data.service_area}
              onChange={(e) => onChange({ service_area: e.target.value })}
              placeholder="Colchester and surrounding areas"
              style={inputStyle}
            />
          </Field>

          <Field label="City">
            <input
              type="text"
              value={data.address_city}
              onChange={(e) => onChange({ address_city: e.target.value })}
              placeholder="Colchester"
              style={inputStyle}
            />
          </Field>
        </>
      )}

      {/* Health & Nutrition specific */}
      {isHealthNutrition && (
        <>
          <Field label="Qualifications (comma-separated)">
            <input
              type="text"
              value={data.qualifications}
              onChange={(e) => onChange({ qualifications: e.target.value })}
              placeholder="BSc Nutrition, ANutr, Level 3 PT"
              style={inputStyle}
            />
          </Field>

          <Field label="Specialisms (comma-separated)">
            <input
              type="text"
              value={data.specialisms}
              onChange={(e) => onChange({ specialisms: e.target.value })}
              placeholder="Weight loss, Sports nutrition, Vegan"
              style={inputStyle}
            />
          </Field>

          <label className="flex items-center gap-3" style={{ padding: '8px 0' }}>
            <input
              type="checkbox"
              checked={data.accepts_clients}
              onChange={(e) => onChange({ accepts_clients: e.target.checked })}
              className="rounded"
              style={{ width: 20, height: 20, accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)' }}>
              Currently accepting new clients
            </span>
          </label>

          <Field label="Consultation type">
            <PillSelect
              options={['in_person', 'online']}
              selected={data.consultation_type}
              onToggle={(val) => onChange({ consultation_type: toggleArrayItem(data.consultation_type, val) })}
              labels={{ in_person: 'In-person', online: 'Online' }}
            />
          </Field>

          <Field label="Service area">
            <input
              type="text"
              value={data.service_area}
              onChange={(e) => onChange({ service_area: e.target.value })}
              placeholder="Colchester and surrounding areas"
              style={inputStyle}
            />
          </Field>

          <Field label="City (optional)">
            <input
              type="text"
              value={data.address_city}
              onChange={(e) => onChange({ address_city: e.target.value })}
              placeholder="Colchester"
              style={inputStyle}
            />
          </Field>
        </>
      )}
    </div>
  );
}
