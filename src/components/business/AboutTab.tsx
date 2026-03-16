'use client';

import { Clock, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { getBusinessTypeGroup, type BusinessProfile } from '@/types/database';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface AboutTabProps {
  businessProfile: BusinessProfile;
}

export function AboutTab({ businessProfile: bp }: AboutTabProps) {
  const group = getBusinessTypeGroup(bp.business_type);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Bio */}
      {bp.bio && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          {bp.bio}
        </p>
      )}

      {/* Opening hours (Food Service & Shops) */}
      {bp.opening_hours && (group === 'food_service' || group === 'shops_retail') && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Opening Hours
            </h4>
          </div>
          <div className="flex flex-col gap-1">
            {DAY_KEYS.map((key, i) => {
              const hours = bp.opening_hours?.[key];
              return (
                <div key={key} className="flex justify-between" style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{DAY_NAMES[i]}</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {hours ? `${hours.open} – ${hours.close}` : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Address */}
      {(bp.address_line_1 || bp.address_city) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Address
            </h4>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {bp.address_line_1 && <>{bp.address_line_1}<br /></>}
            {bp.address_line_2 && <>{bp.address_line_2}<br /></>}
            {bp.address_city && <>{bp.address_city}<br /></>}
            {bp.address_postcode && <>{bp.address_postcode}<br /></>}
          </p>
        </div>
      )}

      {/* Cuisine types */}
      {bp.cuisine_types?.length > 0 && (
        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Cuisine
          </h4>
          <div className="flex flex-wrap gap-2">
            {bp.cuisine_types.map((cuisine) => (
              <span
                key={cuisine}
                className="rounded-full px-3 py-1"
                style={{ fontSize: 13, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                {cuisine}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="flex flex-col gap-2">
        {bp.phone && (
          <a href={`tel:${bp.phone}`} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent-primary)', textDecoration: 'none' }}>
            <Phone size={14} strokeWidth={1.5} /> {bp.phone}
          </a>
        )}
        {bp.email && (
          <a href={`mailto:${bp.email}`} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent-primary)', textDecoration: 'none' }}>
            <Mail size={14} strokeWidth={1.5} /> {bp.email}
          </a>
        )}
        {bp.website_url && (
          <a href={bp.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent-primary)', textDecoration: 'none' }}>
            <Globe size={14} strokeWidth={1.5} /> {bp.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>

      {/* Health & Nutrition specific */}
      {group === 'health_nutrition' && (
        <>
          {bp.qualifications?.length > 0 && (
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Qualifications</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                {bp.qualifications.join(', ')}
              </p>
            </div>
          )}
          {bp.specialisms?.length > 0 && (
            <div>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Specialisms</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                {bp.specialisms.join(', ')}
              </p>
            </div>
          )}
          {bp.accepts_clients && (
            <span className="self-start rounded-full px-3 py-1" style={{ fontSize: 12, fontWeight: 600, backgroundColor: 'rgba(76, 175, 80, 0.15)', color: 'var(--status-success)' }}>
              Accepting clients
            </span>
          )}
          {bp.consultation_type?.length > 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Consultation: {bp.consultation_type.join(', ').replace('in_person', 'In-person').replace('online', 'Online')}
            </p>
          )}
          {bp.service_area && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Service area: {bp.service_area}
            </p>
          )}
        </>
      )}

      {/* Chefs & Experiences specific */}
      {group === 'chefs_experiences' && (
        <>
          {bp.class_types?.length > 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Class types: {bp.class_types.join(', ')}
            </p>
          )}
          {bp.price_from_pence != null && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              From £{(bp.price_from_pence / 100).toFixed(0)}
            </p>
          )}
          {bp.service_area && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Service area: {bp.service_area}
            </p>
          )}
        </>
      )}

      {/* Retail/Production specific */}
      {(group === 'shops_retail' || group === 'production') && bp.delivery_available && (
        <span className="self-start rounded-full px-3 py-1" style={{ fontSize: 12, fontWeight: 600, backgroundColor: 'rgba(76, 175, 80, 0.15)', color: 'var(--status-success)' }}>
          Delivery available
        </span>
      )}
    </div>
  );
}
