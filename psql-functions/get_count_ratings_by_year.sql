CREATE OR REPLACE FUNCTION get_count_ratings_by_year (selected_year int)
RETURNS TABLE(
    imdb_id int,
    title text,
    votes bigint,
    year int
    )
AS $$
BEGIN
    RETURN QUERY
    WITH r AS (
    SELECT "movieId", COUNT(*) as ratings
    FROM movie_ratings
    WHERE 1970 + timestamp / 31557600 = selected_year
    GROUP BY "movieId"
    )
    select
    movies.imdb_id,
    movies.title,
    r.ratings,
    selected_year
    from movies
    join r on r."movieId" = movies.imdb_id
    group by movies.imdb_id, movies.title, r.ratings
    order by ratings DESC;
END;
$$ LANGUAGE plpgsql;