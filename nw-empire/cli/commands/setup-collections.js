'use strict';

/**
 * Returns PocketBase collection schemas for initial setup
 * Field options must match PocketBase 0.22 requirements:
 *   - text fields: { min, max, pattern }
 *   - number fields: { min, max, noDecimal }
 *   - url/email fields: { exceptDomains, onlyDomains }
 *   - json fields: { maxSize } (required)
 *   - bool fields: {} (empty ok)
 */
module.exports = function setupCollections(token) {
  const textOpts = { min: null, max: null, pattern: '' };
  const numOpts  = { min: null, max: null, noDecimal: false };
  const urlOpts  = { exceptDomains: null, onlyDomains: null };
  const jsonOpts = { maxSize: 2000000 };

  return [
    {
      name: 'listings',
      schema: {
        name: 'listings',
        type: 'base',
        schema: [
          { name: 'niche',                  type: 'text',   required: true,  options: textOpts },
          { name: 'business_name',          type: 'text',   required: true,  options: textOpts },
          { name: 'slug',                   type: 'text',   required: true,  options: textOpts },
          { name: 'city',                   type: 'text',   required: true,  options: textOpts },
          { name: 'state',                  type: 'text',   required: false, options: textOpts },
          { name: 'address',                type: 'text',   required: false, options: textOpts },
          { name: 'zip',                    type: 'text',   required: false, options: textOpts },
          { name: 'phone',                  type: 'text',   required: false, options: textOpts },
          { name: 'website',                type: 'url',    required: false, options: urlOpts  },
          { name: 'email',                  type: 'email',  required: false, options: urlOpts  },
          { name: 'google_rating',          type: 'number', required: false, options: numOpts  },
          { name: 'google_review_count',    type: 'number', required: false, options: numOpts  },
          { name: 'is_featured',            type: 'bool',   required: false, options: {}       },
          { name: 'is_luxury',              type: 'bool',   required: false, options: {}       },
          { name: 'is_verified',            type: 'bool',   required: false, options: {}       },
          { name: 'status',                 type: 'text',   required: false, options: textOpts },
          { name: 'description',            type: 'text',   required: false, options: textOpts },
          { name: 'unit_types',             type: 'json',   required: false, options: jsonOpts },
          { name: 'amenities',              type: 'json',   required: false, options: jsonOpts },
          { name: 'service_areas',          type: 'json',   required: false, options: jsonOpts },
          { name: 'service_radius_miles',   type: 'number', required: false, options: numOpts  },
          { name: 'images',                 type: 'json',   required: false, options: jsonOpts },
          { name: 'lat',                    type: 'number', required: false, options: numOpts  },
          { name: 'lng',                    type: 'number', required: false, options: numOpts  },
        ],
        listRule:   'status = "active"',
        viewRule:   'status = "active"',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
      },
    },
    {
      name: 'leads',
      schema: {
        name: 'leads',
        type: 'base',
        schema: [
          { name: 'niche',            type: 'text',   required: true,  options: textOpts },
          { name: 'listing_id',       type: 'text',   required: false, options: textOpts },
          { name: 'name',             type: 'text',   required: true,  options: textOpts },
          { name: 'email',            type: 'email',  required: true,  options: urlOpts  },
          { name: 'phone',            type: 'text',   required: true,  options: textOpts },
          { name: 'event_type',       type: 'text',   required: true,  options: textOpts },
          { name: 'event_date',       type: 'text',   required: false, options: textOpts },
          { name: 'event_location',   type: 'text',   required: true,  options: textOpts },
          { name: 'unit_quantity',    type: 'number', required: false, options: numOpts  },
          { name: 'unit_type',        type: 'text',   required: false, options: textOpts },
          { name: 'duration_days',    type: 'number', required: false, options: numOpts  },
          { name: 'message',          type: 'text',   required: false, options: textOpts },
          { name: 'source_url',       type: 'url',    required: false, options: urlOpts  },
          { name: 'routed_to_vendor', type: 'bool',   required: false, options: {}       },
          { name: 'routed_at',        type: 'text',   required: false, options: textOpts },
          { name: 'lead_paid',        type: 'bool',   required: false, options: {}       },
        ],
        listRule:   null,   // Only admins can list
        viewRule:   null,
        createRule: '',     // Anyone can create
        updateRule: null,
        deleteRule: null,
      },
    },
    {
      name: 'vendors',
      schema: {
        name: 'vendors',
        type: 'base',
        schema: [
          { name: 'user_id',           type: 'text', required: true,  options: textOpts },
          { name: 'listing_id',        type: 'text', required: false, options: textOpts },
          { name: 'business_name',     type: 'text', required: true,  options: textOpts },
          { name: 'subscription_tier', type: 'text', required: false, options: textOpts },
          { name: 'verified',          type: 'bool', required: false, options: {}       },
        ],
        listRule:   '@request.auth.id != ""',
        viewRule:   '@request.auth.id = user_id',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = user_id',
        deleteRule: null,
      },
    },
  ];
};
