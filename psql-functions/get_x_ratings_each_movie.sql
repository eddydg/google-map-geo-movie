CREATE OR REPLACE FUNCTION get_x_ratings_each_movie (x int)
RETURNS TABLE(
    imdb_id int,
    rating numeric,
    year int
    )
AS $$
BEGIN
    RETURN QUERY
    WITH r AS (
        select *, row_number() over (partition by "movieId") as rownum
        from movie_ratings
    )
    select "movieId", r.rating, extract(year from to_timestamp(timestamp))::int as year
    from r
    where rownum < x
END;
$$ LANGUAGE plpgsql;