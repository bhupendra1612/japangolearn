-- Marketplace MVP: multi-role accounts, teacher approval, courses, video assets,
-- free enrolment and paid course entitlements.

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (
    role in ('student', 'teacher', 'admin', 'support', 'finance', 'content_reviewer')
  ),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

insert into public.user_roles (user_id, role)
select id, 'student'
from public.profiles
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'admin'
from public.profiles
where role = 'admin'
on conflict (user_id, role) do nothing;

create or replace function private.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = required_role
    )
    or (
      required_role = 'admin'
      and exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and role = 'admin'
      )
    );
$$;

revoke all on function private.has_role(text) from public, anon, authenticated;
grant execute on function private.has_role(text) to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin');
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

create table public.teacher_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  bio text not null default '',
  qualifications text not null default '',
  experience_years integer not null default 0 check (experience_years between 0 and 80),
  status text not null default 'draft' check (
    status in (
      'draft', 'submitted', 'under_review', 'changes_requested',
      'approved', 'rejected', 'suspended'
    )
  ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.course_categories (slug, name, description, sort_order)
values
  ('jlpt', 'JLPT Preparation', 'Structured preparation for JLPT N5 to N1.', 10),
  ('conversation', 'Conversation', 'Practical spoken Japanese lessons.', 20),
  ('grammar', 'Grammar', 'Japanese grammar from beginner to advanced.', 30),
  ('writing', 'Writing', 'Hiragana, katakana and kanji writing.', 40),
  ('teacher-resources', 'Teacher Resources', 'Free and paid material for teachers.', 50)
on conflict (slug) do nothing;

create table public.courses (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete restrict,
  category_id uuid references public.course_categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '',
  description text not null default '',
  level text not null default 'ALL' check (level in ('N5', 'N4', 'N3', 'N2', 'N1', 'ALL')),
  language text not null default 'en' check (language in ('en', 'hi', 'ja')),
  pricing_type text not null default 'free' check (pricing_type in ('free', 'paid')),
  price_minor integer not null default 0 check (price_minor >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  thumbnail_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (pricing_type = 'free' and price_minor = 0)
    or (pricing_type = 'paid' and price_minor > 0)
  )
);

create table public.course_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.video_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  bunny_video_id text unique,
  title text not null check (char_length(title) between 1 and 160),
  file_name text,
  status text not null default 'created' check (
    status in ('created', 'uploading', 'processing', 'ready', 'failed')
  ),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  video_asset_id uuid references public.video_assets(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '',
  lesson_type text not null default 'video' check (
    lesson_type in ('video', 'article', 'quiz', 'download')
  ),
  content jsonb not null default '{}'::jsonb,
  is_preview boolean not null default false,
  position integer not null default 0 check (position >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, position)
);

create table public.course_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  provider text,
  provider_payment_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index course_orders_provider_payment_id_key
  on public.course_orders (provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.course_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_id uuid references public.course_orders(id) on delete set null,
  source text not null check (source in ('free', 'purchase', 'admin')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.marketplace_audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index user_roles_role_idx on public.user_roles (role, user_id);
create index teacher_profiles_status_idx on public.teacher_profiles (status);
create index courses_catalog_idx on public.courses (status, pricing_type, published_at desc);
create index courses_teacher_idx on public.courses (teacher_id, status);
create index course_sections_course_idx on public.course_sections (course_id, position);
create index course_lessons_course_idx on public.course_lessons (course_id, section_id, position);
create index video_assets_teacher_idx on public.video_assets (teacher_id, created_at desc);
create index course_orders_user_idx on public.course_orders (user_id, created_at desc);
create index course_entitlements_user_idx
  on public.course_entitlements (user_id, status, course_id);
create index marketplace_audit_log_entity_idx
  on public.marketplace_audit_log (entity_type, entity_id, created_at desc);

create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row execute function private.set_updated_at();
create trigger course_categories_set_updated_at
  before update on public.course_categories
  for each row execute function private.set_updated_at();
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function private.set_updated_at();
create trigger course_sections_set_updated_at
  before update on public.course_sections
  for each row execute function private.set_updated_at();
create trigger video_assets_set_updated_at
  before update on public.video_assets
  for each row execute function private.set_updated_at();
create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute function private.set_updated_at();
create trigger course_orders_set_updated_at
  before update on public.course_orders
  for each row execute function private.set_updated_at();
create trigger course_entitlements_set_updated_at
  before update on public.course_entitlements
  for each row execute function private.set_updated_at();

create or replace function private.is_approved_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_profiles
    where user_id = (select auth.uid())
      and status = 'approved'
  );
$$;

revoke all on function private.is_approved_teacher() from public, anon, authenticated;
grant execute on function private.is_approved_teacher() to authenticated, service_role;

create or replace function private.can_access_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.courses
    where id = target_course_id
      and (
        teacher_id = (select auth.uid())
        or pricing_type = 'free'
        or exists (
          select 1
          from public.course_entitlements
          where user_id = (select auth.uid())
            and course_id = target_course_id
            and status = 'active'
            and (expires_at is null or expires_at > now())
        )
      )
  )
  or private.has_role('admin');
$$;

revoke all on function private.can_access_course(uuid) from public, anon, authenticated;
grant execute on function private.can_access_course(uuid) to authenticated, service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, current_jlpt_level)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'), ''),
    case
      when new.raw_user_meta_data ->> 'current_jlpt_level' in ('N5', 'N4', 'N3', 'N2', 'N1')
        then new.raw_user_meta_data ->> 'current_jlpt_level'
      else 'N5'
    end
  )
  on conflict (id) do nothing;

  insert into public.user_level_progress (user_id, jlpt_level, progress_percent)
  values (new.id, 'N5', 0)
  on conflict (user_id, jlpt_level) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.submit_teacher_application()
returns public.teacher_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.teacher_profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.teacher_profiles
  set
    status = 'submitted',
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    review_notes = null
  where user_id = (select auth.uid())
    and status in ('draft', 'changes_requested', 'rejected')
  returning * into application;

  if application.user_id is null then
    raise exception 'Create or update a teacher profile before submitting';
  end if;

  insert into public.marketplace_audit_log (
    actor_id, action, entity_type, entity_id, new_value
  )
  values (
    (select auth.uid()),
    'teacher.application_submitted',
    'teacher_profile',
    application.user_id,
    jsonb_build_object('status', application.status)
  );

  return application;
end;
$$;

revoke all on function public.submit_teacher_application() from public, anon;
grant execute on function public.submit_teacher_application() to authenticated;

create or replace function public.review_teacher_application(
  target_user_id uuid,
  decision text,
  notes text default null
)
returns public.teacher_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_application public.teacher_profiles;
  application public.teacher_profiles;
begin
  if not (
    private.has_role('admin')
    or private.has_role('content_reviewer')
  ) then
    raise exception 'Reviewer access required' using errcode = '42501';
  end if;

  if decision not in ('approved', 'changes_requested', 'rejected', 'suspended') then
    raise exception 'Invalid teacher review decision';
  end if;

  select *
  into previous_application
  from public.teacher_profiles
  where user_id = target_user_id
  for update;

  if previous_application.user_id is null then
    raise exception 'Teacher application not found';
  end if;

  update public.teacher_profiles
  set
    status = decision,
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    review_notes = nullif(btrim(notes), '')
  where user_id = target_user_id
  returning * into application;

  if decision = 'approved' then
    insert into public.user_roles (user_id, role, granted_by)
    values (target_user_id, 'teacher', (select auth.uid()))
    on conflict (user_id, role) do update
      set granted_by = excluded.granted_by,
          granted_at = now();
  elsif decision = 'suspended' then
    delete from public.user_roles
    where user_id = target_user_id
      and role = 'teacher';
  end if;

  insert into public.marketplace_audit_log (
    actor_id, action, entity_type, entity_id, previous_value, new_value
  )
  values (
    (select auth.uid()),
    'teacher.application_reviewed',
    'teacher_profile',
    target_user_id,
    jsonb_build_object('status', previous_application.status),
    jsonb_build_object('status', application.status, 'notes', application.review_notes)
  );

  return application;
end;
$$;

revoke all on function public.review_teacher_application(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_teacher_application(uuid, text, text)
  to authenticated;

create or replace function public.enroll_free_course(target_course_id uuid)
returns public.course_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement public.course_entitlements;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = target_course_id
      and status = 'published'
      and pricing_type = 'free'
  ) then
    raise exception 'Published free course not found';
  end if;

  insert into public.course_entitlements (user_id, course_id, source, status)
  values ((select auth.uid()), target_course_id, 'free', 'active')
  on conflict (user_id, course_id) do update
    set source = 'free',
        status = 'active',
        order_id = null,
        granted_at = now(),
        expires_at = null
  returning * into entitlement;

  insert into public.marketplace_audit_log (
    actor_id, action, entity_type, entity_id, new_value
  )
  values (
    (select auth.uid()),
    'course.free_enrolled',
    'course',
    target_course_id,
    jsonb_build_object('entitlement_id', entitlement.id)
  );

  return entitlement;
end;
$$;

revoke all on function public.enroll_free_course(uuid) from public, anon;
grant execute on function public.enroll_free_course(uuid) to authenticated;

create or replace function public.create_course_order(
  target_course_id uuid,
  request_idempotency_key text
)
returns public.course_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_course public.courses;
  created_order public.course_orders;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(btrim(request_idempotency_key), '') is null then
    raise exception 'Idempotency key is required';
  end if;

  select *
  into selected_course
  from public.courses
  where id = target_course_id
    and status = 'published'
    and pricing_type = 'paid';

  if selected_course.id is null then
    raise exception 'Published paid course not found';
  end if;

  insert into public.course_orders (
    user_id, course_id, amount_minor, currency, idempotency_key
  )
  values (
    (select auth.uid()),
    selected_course.id,
    selected_course.price_minor,
    selected_course.currency,
    request_idempotency_key
  )
  on conflict (idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning * into created_order;

  if created_order.user_id <> (select auth.uid())
    or created_order.course_id <> selected_course.id then
    raise exception 'Idempotency key belongs to another order';
  end if;

  return created_order;
end;
$$;

revoke all on function public.create_course_order(uuid, text) from public, anon;
grant execute on function public.create_course_order(uuid, text) to authenticated;

create or replace function public.fulfill_course_order(
  target_order_id uuid,
  payment_provider text,
  payment_id text
)
returns public.course_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.course_orders;
  entitlement public.course_entitlements;
begin
  if nullif(btrim(payment_provider), '') is null
    or nullif(btrim(payment_id), '') is null then
    raise exception 'Payment provider and payment id are required';
  end if;

  select *
  into selected_order
  from public.course_orders
  where id = target_order_id
  for update;

  if selected_order.id is null then
    raise exception 'Order not found';
  end if;

  if selected_order.status not in ('pending', 'paid') then
    raise exception 'Order cannot be fulfilled from status %', selected_order.status;
  end if;

  update public.course_orders
  set
    status = 'paid',
    provider = payment_provider,
    provider_payment_id = payment_id,
    paid_at = coalesce(paid_at, now())
  where id = target_order_id;

  insert into public.course_entitlements (
    user_id, course_id, order_id, source, status
  )
  values (
    selected_order.user_id,
    selected_order.course_id,
    selected_order.id,
    'purchase',
    'active'
  )
  on conflict (user_id, course_id) do update
    set order_id = excluded.order_id,
        source = 'purchase',
        status = 'active',
        granted_at = now(),
        expires_at = null
  returning * into entitlement;

  insert into public.marketplace_audit_log (
    actor_id, action, entity_type, entity_id, new_value
  )
  values (
    null,
    'course.order_fulfilled',
    'course_order',
    target_order_id,
    jsonb_build_object(
      'provider', payment_provider,
      'provider_payment_id', payment_id,
      'entitlement_id', entitlement.id
    )
  );

  return entitlement;
end;
$$;

revoke all on function public.fulfill_course_order(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_course_order(uuid, text, text)
  to service_role;

alter table public.user_roles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.video_assets enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_orders enable row level security;
alter table public.course_entitlements enable row level security;
alter table public.marketplace_audit_log enable row level security;

create policy user_roles_select_own_or_admin
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy teacher_profiles_select_approved
  on public.teacher_profiles for select to anon, authenticated
  using (status = 'approved');

create policy teacher_profiles_select_private
  on public.teacher_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or (select private.has_role('content_reviewer'))
  );

create policy teacher_profiles_insert_own
  on public.teacher_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy teacher_profiles_update_own
  on public.teacher_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy course_categories_select_active
  on public.course_categories for select to anon, authenticated
  using (is_active);

create policy course_categories_admin_select
  on public.course_categories for select to authenticated
  using ((select private.is_admin()));

create policy course_categories_admin_write
  on public.course_categories for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy courses_select_catalog
  on public.courses for select to anon, authenticated
  using (status = 'published');

create policy courses_select_private
  on public.courses for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or (select private.is_admin())
    or (select private.has_role('content_reviewer'))
  );

create policy courses_teacher_insert
  on public.courses for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.is_approved_teacher())
  );

create policy courses_teacher_update
  on public.courses for update to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (
      teacher_id = (select auth.uid())
      and (select private.is_approved_teacher())
    )
    or (select private.is_admin())
  );

create policy courses_teacher_delete
  on public.courses for delete to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy course_sections_select_catalog
  on public.course_sections for select to anon, authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and courses.status = 'published'
    )
  );

create policy course_sections_select_private
  on public.course_sections for select to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and (
          courses.teacher_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

create policy course_sections_teacher_write
  on public.course_sections for all to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and (
          courses.teacher_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and (
          (
            courses.teacher_id = (select auth.uid())
            and (select private.is_approved_teacher())
          )
          or (select private.is_admin())
        )
    )
  );

create policy video_assets_select_owner
  on public.video_assets for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy video_assets_teacher_insert
  on public.video_assets for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.is_approved_teacher())
    and (
      course_id is null
      or exists (
        select 1 from public.courses
        where courses.id = video_assets.course_id
          and courses.teacher_id = (select auth.uid())
      )
    )
  );

create policy video_assets_teacher_update
  on public.video_assets for update to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    teacher_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy video_assets_teacher_delete
  on public.video_assets for delete to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy course_lessons_select_previews
  on public.course_lessons for select to anon, authenticated
  using (
    exists (
      select 1
      from public.courses
      where courses.id = course_lessons.course_id
        and courses.status = 'published'
        and course_lessons.is_preview
    )
  );

create policy course_lessons_select_entitled
  on public.course_lessons for select to authenticated
  using ((select private.can_access_course(course_lessons.course_id)));

create policy course_lessons_teacher_write
  on public.course_lessons for all to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and (
          courses.teacher_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_lessons.course_id
        and (
          (
            courses.teacher_id = (select auth.uid())
            and (select private.is_approved_teacher())
          )
          or (select private.is_admin())
        )
    )
    and exists (
      select 1 from public.course_sections
      where course_sections.id = course_lessons.section_id
        and course_sections.course_id = course_lessons.course_id
    )
    and (
      video_asset_id is null
      or exists (
        select 1 from public.video_assets
        where video_assets.id = course_lessons.video_asset_id
          and video_assets.course_id = course_lessons.course_id
      )
    )
  );

create policy course_orders_select_own_or_admin
  on public.course_orders for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy course_entitlements_select_own_or_admin
  on public.course_entitlements for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy marketplace_audit_log_admin_select
  on public.marketplace_audit_log for select to authenticated
  using ((select private.is_admin()));

revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.teacher_profiles from anon, authenticated;
revoke all on table public.course_categories from anon, authenticated;
revoke all on table public.courses from anon, authenticated;
revoke all on table public.course_sections from anon, authenticated;
revoke all on table public.video_assets from anon, authenticated;
revoke all on table public.course_lessons from anon, authenticated;
revoke all on table public.course_orders from anon, authenticated;
revoke all on table public.course_entitlements from anon, authenticated;
revoke all on table public.marketplace_audit_log from anon, authenticated;

grant select on public.teacher_profiles, public.course_categories, public.courses,
  public.course_sections, public.course_lessons to anon, authenticated;
grant select on public.user_roles, public.video_assets, public.course_orders,
  public.course_entitlements, public.marketplace_audit_log to authenticated;

grant insert (user_id, slug, display_name, bio, qualifications, experience_years)
  on public.teacher_profiles to authenticated;
grant update (slug, display_name, bio, qualifications, experience_years)
  on public.teacher_profiles to authenticated;

grant insert, update, delete on public.course_categories to authenticated;
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.course_sections to authenticated;
grant insert, update, delete on public.video_assets to authenticated;
grant insert, update, delete on public.course_lessons to authenticated;

grant all on table public.user_roles, public.teacher_profiles,
  public.course_categories, public.courses, public.course_sections,
  public.video_assets, public.course_lessons, public.course_orders,
  public.course_entitlements, public.marketplace_audit_log to service_role;
