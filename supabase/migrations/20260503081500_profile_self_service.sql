create or replace function public.update_own_profile(
  display_name_input text,
  custom_emoji_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(display_name_input), '') is null then
    raise exception 'Display name is required';
  end if;

  update public.profiles
  set
    display_name = trim(display_name_input),
    custom_emoji = nullif(trim(custom_emoji_input), ''),
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

grant execute on function public.update_own_profile(text, text) to authenticated;
