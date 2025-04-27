
-- Create function to increment a value
CREATE OR REPLACE FUNCTION public.increment(x integer)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT $1 + 1
$$;

-- Create function to decrement a value
CREATE OR REPLACE FUNCTION public.decrement(x integer)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT $1 - 1
$$;
