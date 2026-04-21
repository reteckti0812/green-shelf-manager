INSERT INTO public.profiles (user_id, nome, cargo, ativo)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'nome', u.email), COALESCE(u.raw_user_meta_data->>'cargo', 'Operador'), true
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'operador'::public.app_role)
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;