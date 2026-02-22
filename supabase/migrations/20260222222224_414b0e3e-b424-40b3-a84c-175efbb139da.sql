
CREATE POLICY "Users can update their own contact messages"
ON public.contact_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact messages"
ON public.contact_messages
FOR DELETE
USING (auth.uid() = user_id);
