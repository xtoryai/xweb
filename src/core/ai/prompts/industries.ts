/**
 * Industry knowledge snippets for AI template generation.
 *
 * When the user's prompt mentions a specific industry, relevant context is
 * injected into the system prompt to help the AI generate domain-appropriate
 * collections, fields, and defaults.
 */

export const INDUSTRY_KNOWLEDGE: Record<string, string> = {
  restaurant: `## Restaurant / Food Industry Context
Common collections for restaurant websites:
- **menu** or **menu-items**: name, description, price, category (appetizer/main/dessert/drinks), image, dietary tags (spicy/vegetarian/gluten-free), recommended (boolean)
- **locations** or **branches**: name, address, phone, hours, map_link, image
- **reservations** or **bookings**: name, phone, email, date, time, party_size, notes, status (pending/confirmed/cancelled)
- Common features: dark-mode, responsive, photo-heavy layout
- Recommended customizable: warm color palette (orange/red tones), food-friendly typography`,

  'law-firm': `## Law Firm / Legal Industry Context
Common collections for law firm websites:
- **attorneys** or **team**: name, title, photo, bio, specialties (list), email, phone, bar_number, education, languages
- **practice-areas**: title, icon, description, related_attorneys, order
- **cases** or **results**: title, client, description, outcome, date, practice_area
- **consultations**: name, phone, email, description, preferred_date, practice_area
- Common features: responsive, search, professional blue/navy color scheme
- Recommended customizable: formal typography (serif headings), navy/white color scheme`,

  medical: `## Medical / Healthcare Industry Context
Common collections for clinic/hospital websites:
- **doctors** or **physicians**: name, photo, title, specialty, bio, education, hospital, schedule
- **departments**: name, icon, description, head_doctor
- **appointments**: name, phone, id_number, department, preferred_date, preferred_time, notes
- **health-articles**: title, author, body, date, category, image
- Common features: responsive, accessibility, search
- Recommended customizable: calm color palette (blues/greens), clean sans-serif fonts`,

  education: `## Education / Training Industry Context
Common collections for education websites:
- **courses** or **programs**: title, description, price, duration, age_range, max_students, image, category, featured
- **teachers** or **instructors**: name, photo, title, bio, specialties, email
- **enrollments** or **registrations**: student_name, phone, email, course, notes
- **events** or **workshops**: title, description, date, time, location, capacity, price, image
- Common features: responsive, search, gallery
- Recommended customizable: vibrant colors, rounded typography, kid-friendly`,

  ecommerce: `## E-commerce / Retail Industry Context
Common collections for e-commerce sites:
- **products**: title, description, price, compare_price, sku, stock, category, images (list), specs (object), featured
- **categories**: name, description, image, parent_category, order
- **orders** or **inquiries**: customer_name, phone, email, product, quantity, notes, status
- Common features: responsive, search, grid layout
- Recommended customizable: brand-forward colors, product-grid layout options`,

  saas: `## SaaS / Tech Industry Context
Common collections for SaaS product sites:
- **features** or **products**: title, icon, description, screenshot, category, order
- **pricing-plans**: name, price, period, features (list), cta_text, cta_link, highlighted
- **docs** or **help-center**: title, body, category, order, last_updated
- **integrations**: name, logo, description, category, docs_link
- Common features: responsive, dark-mode, search, docs-sidebar
- Recommended customizable: modern sans-serif fonts, tech-forward color scheme (blues/purples), dark mode default`,
};

/**
 * Detect which industry knowledge snippets match the user's prompt.
 * Returns concatenated relevant context strings.
 */
export function detectIndustries(prompt: string): string {
  const lower = prompt.toLowerCase();
  const matched: string[] = [];

  // Keyword mapping — each key maps to an INDUSTRY_KNOWLEDGE entry
  const keywords: Record<string, string[]> = {
    restaurant: ['餐厅', '饭店', '餐馆', '美食', '菜品', '外卖', 'restaurant', 'food', 'menu', 'dining', 'catering'],
    'law-firm': ['律师', '律所', '法律', '法务', '诉讼', '辩护', 'law', 'attorney', 'legal', 'litigation'],
    medical: ['医院', '诊所', '医生', '医疗', '科室', '挂号', '门诊', 'health', 'clinic', 'medical', 'doctor', 'hospital'],
    education: ['教育', '培训', '课程', '学校', '老师', '学习', '招生', 'education', 'training', 'course', 'school', 'teacher'],
    ecommerce: ['电商', '商城', '产品', '商品', '购物', '零售', 'ecommerce', 'shop', 'store', 'product', 'retail'],
    saas: ['saas', '软件', '平台', 'app', '订阅', '产品', '功能', '定价', 'api', 'cloud', 'software', 'platform'],
  };

  for (const [industry, words] of Object.entries(keywords)) {
    const hit = words.some((w) => lower.includes(w.toLowerCase()));
    if (hit && INDUSTRY_KNOWLEDGE[industry]) {
      matched.push(INDUSTRY_KNOWLEDGE[industry]);
    }
  }

  return matched.join('\n\n');
}
