/**
 * Convert a string to a URL-friendly slug.
 * Lowercase, alphanumeric + hyphens only, max 60 chars.
 */
export function slugify(input: string, maxLength = 60): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens
    .slice(0, maxLength);
}

/**
 * Convert ISO 3166-1 alpha-2 country code to URL slug.
 * Special case: GB → uk (standard convention).
 */
export function countrySlug(isoCode: string): string {
  const code = isoCode.toUpperCase();
  if (code === 'GB') return 'uk';
  return code.toLowerCase();
}

/**
 * Generate a unique premise slug within a city.
 * Appends -2, -3, etc. if the base slug already exists.
 */
export async function generateUniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  name: string,
  countrySl: string,
  regionSl: string,
  citySl: string,
): Promise<string> {
  const base = slugify(name);
  if (!base) return slugify(`premise-${Date.now()}`);

  let candidate = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('business_premises')
      .select('id')
      .eq('country_slug', countrySl)
      .eq('region_slug', regionSl)
      .eq('city_slug', citySl)
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
    suffix++;
    candidate = `${base}-${suffix}`;
  }
}
