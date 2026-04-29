REVOKE EXECUTE ON FUNCTION public.match_donors(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_matched_donors(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.respond_to_notification(UUID, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.match_donors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_matched_donors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_notification(UUID, BOOLEAN) TO authenticated;