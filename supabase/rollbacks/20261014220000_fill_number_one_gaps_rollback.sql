-- Reverse 20261014220000_fill_number_one_gaps.sql.
-- Restores the reviewed duplicate rows, the previous dates and weeks,
-- and UNIQUE (title, artist_id). Does not touch songs this migration did not change.
BEGIN;

DELETE FROM public.chart_entries
WHERE id BETWEEN 1473 AND 1705;
DELETE FROM public.songs
WHERE id BETWEEN 1741 AND 1973;

DO $artists$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 824
    AND s.artist_id = target.id
    AND target.name = 'Jimmy Soul'
    AND original.name = 'Jimmy Dean';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 824 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 821
    AND s.artist_id = target.id
    AND target.name = 'The Essex'
    AND original.name = 'The Shirelles';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 821 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 823
    AND s.artist_id = target.id
    AND target.name = 'Jimmy Gilmer and the Fireballs'
    AND original.name = 'Jimmy Dean';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 823 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 862
    AND s.artist_id = target.id
    AND target.name = 'The Four Tops'
    AND original.name = 'The Four Seasons';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 862 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 897
    AND s.artist_id = target.id
    AND target.name = 'The Mamas and the Papas'
    AND original.name = 'The Lovin'' Spoonful';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 897 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 860
    AND s.artist_id = target.id
    AND target.name = 'The Four Tops'
    AND original.name = 'The Four Seasons';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 860 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 889
    AND s.artist_id = target.id
    AND target.name = '? and the Mysterians'
    AND original.name = 'The McCoys';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 889 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 876
    AND s.artist_id = target.id
    AND target.name = 'Johnny Rivers'
    AND original.name = 'The Righteous Brothers';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 876 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 944
    AND s.artist_id = target.id
    AND target.name = 'Bobbie Gentry'
    AND original.name = 'Bobby Gentry';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 944 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 928
    AND s.artist_id = target.id
    AND target.name = 'Peter, Paul and Mary'
    AND original.name = 'Peter and Gordon';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 928 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = original.id
  FROM public.artists original, public.artists target
  WHERE s.id = 1740
    AND s.artist_id = target.id
    AND target.name = '50 Cent'
    AND original.name = 'Fifty Cent';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist rollback for song 1740 updated % rows', updated_count;
  END IF;
END
$artists$;

DELETE FROM public.artists WHERE id IN (2379, 2380, 2381, 2382, 2383, 2384, 2385, 2386, 2387, 2388, 2389, 2390, 2391, 2392, 2393, 2394, 2395, 2396, 2397, 2398, 2399, 2400, 2401, 2402, 2403, 2404, 2405, 2406, 2407, 2408, 2409, 2410, 2411, 2412, 2413, 2414, 2415, 2416, 2417, 2418, 2419, 2420, 2421, 2422, 2423, 2424, 2425, 2426, 2427, 2428, 2429, 2430, 2431, 2432, 2433, 2434, 2435);

DO $dates$
DECLARE
  updated_count integer;
  year_count integer;
BEGIN
  WITH src AS (
    SELECT * FROM (VALUES
      (770::int, DATE '1960-09-19', 1::int, DATE '1960-09-19', 3::int, 1960::int, 1960::int),
      (479::int, DATE '2007-09-08', 1::int, DATE '1962-11-17', 6::int, 2007::int, 1962::int),
      (811::int, DATE '1962-11-17', 5::int, DATE '1962-11-17', 6::int, 1962::int, 1962::int),
      (824::int, DATE '1963-05-18', 2::int, DATE '1963-05-18', 2::int, 1963::int, 1963::int),
      (821::int, DATE '1963-07-06', 2::int, DATE '1963-07-06', 2::int, 1963::int, 1963::int),
      (823::int, DATE '1963-10-12', 5::int, DATE '1963-10-12', 5::int, 1963::int, 1963::int),
      (862::int, DATE '1965-06-19', 2::int, DATE '1965-06-19', 2::int, 1965::int, 1965::int),
      (879::int, DATE '1966-02-05', 2::int, DATE '1966-02-05', 5::int, 1966::int, 1966::int),
      (1554::int, DATE '2006-11-11', 3::int, DATE '1966-02-05', 5::int, 2006::int, 1966::int),
      (897::int, DATE '1966-05-07', 3::int, DATE '1966-05-07', 3::int, 1966::int, 1966::int),
      (860::int, DATE '1966-10-15', 2::int, DATE '1966-10-15', 2::int, 1966::int, 1966::int),
      (889::int, DATE '1966-10-29', 1::int, DATE '1966-10-29', 1::int, 1966::int, 1966::int),
      (876::int, DATE '1966-11-12', 1::int, DATE '1966-11-12', 1::int, 1966::int, 1966::int),
      (944::int, DATE '1967-08-26', 4::int, DATE '1967-08-26', 4::int, 1967::int, 1967::int),
      (928::int, DATE '1969-12-20', 1::int, DATE '1969-12-20', 1::int, 1969::int, 1969::int),
      (1244::int, DATE '1983-01-15', 4::int, DATE '1983-01-15', 3::int, 1983::int, 1983::int),
      (132::int, DATE '1983-02-05', 1::int, DATE '1983-02-05', 2::int, 1983::int, 1983::int),
      (315::int, DATE '1991-03-23', 1::int, DATE '1988-05-28', 4::int, 1991::int, 1988::int),
      (1339::int, DATE '1988-05-28', 3::int, DATE '1988-05-28', 4::int, 1988::int, 1988::int),
      (1443::int, DATE '1994-03-12', 6::int, DATE '1994-03-12', 4::int, 1994::int, 1994::int),
      (343::int, DATE '1994-04-09', 4::int, DATE '1994-04-09', 6::int, 1994::int, 1994::int),
      (1432::int, DATE '1994-12-03', 6::int, DATE '1994-12-03', 5::int, 1994::int, 1994::int),
      (351::int, DATE '1994-12-17', 2::int, DATE '1994-12-17', 3::int, 1994::int, 1994::int),
      (385::int, DATE '1998-04-25', 5::int, DATE '1998-04-25', 4::int, 1998::int, 1998::int),
      (1477::int, DATE '1998-10-03', 5::int, DATE '1998-10-03', 2::int, 1998::int, 1998::int),
      (389::int, DATE '1998-10-17', 1::int, DATE '1998-10-17', 4::int, 1998::int, 1998::int),
      (402::int, DATE '2000-01-29', 4::int, DATE '2000-01-29', 3::int, 2000::int, 2000::int),
      (1511::int, DATE '2001-03-24', 2::int, DATE '2001-03-24', 1::int, 2001::int, 2001::int),
      (1490::int, DATE '2001-03-31', 1::int, DATE '2001-03-31', 2::int, 2001::int, 2001::int),
      (1514::int, DATE '2001-08-18', 6::int, DATE '2001-08-18', 3::int, 2001::int, 2001::int),
      (418::int, DATE '2001-09-08', 5::int, DATE '2001-09-08', 8::int, 2001::int, 2001::int),
      (1525::int, DATE '2002-08-17', 10::int, DATE '2002-08-17', 7::int, 2002::int, 2002::int),
      (444::int, DATE '2004-05-22', 8::int, DATE '2004-05-22', 7::int, 2004::int, 2004::int),
      (446::int, DATE '2004-07-10', 1::int, DATE '2004-07-10', 2::int, 2004::int, 2004::int),
      (1740::int, DATE '2005-03-05', 9::int, DATE '2005-03-05', 9::int, 2005::int, 2005::int),
      (1497::int, DATE '2005-06-04', 14::int, DATE '2005-06-04', 4::int, 2005::int, 2005::int),
      (1567::int, DATE '2007-05-12', 3::int, DATE '2007-05-12', 2::int, 2007::int, 2007::int),
      (1570::int, DATE '2007-09-15', 7::int, DATE '2007-09-15', 2::int, 2007::int, 2007::int),
      (1563::int, DATE '2007-09-29', 1::int, DATE '2007-09-29', 6::int, 2007::int, 2007::int),
      (483::int, DATE '2008-04-05', 4::int, DATE '2008-04-05', 1::int, 2008::int, 2008::int),
      (1545::int, DATE '2008-04-12', 2::int, DATE '2008-04-12', 3::int, 2008::int, 2008::int),
      (485::int, DATE '2008-05-03', 5::int, DATE '2008-05-03', 3::int, 2008::int, 2008::int),
      (488::int, DATE '2008-09-06', 7::int, DATE '2008-09-06', 3::int, 2008::int, 2008::int),
      (490::int, DATE '2008-10-18', 6::int, DATE '2008-10-18', 1::int, 2008::int, 2008::int),
      (1549::int, DATE '2008-12-13', 4::int, DATE '2008-12-13', 5::int, 2008::int, 2008::int),
      (498::int, DATE '2009-10-17', 2::int, DATE '2009-10-17', 1::int, 2009::int, 2009::int),
      (506::int, DATE '2010-05-15', 4::int, DATE '2010-05-15', 1::int, 2010::int, 2010::int),
      (1547::int, DATE '2010-05-22', 1::int, DATE '2010-05-22', 4::int, 2010::int, 2010::int),
      (1566::int, DATE '2010-10-30', 3::int, DATE '2010-10-30', 2::int, 2010::int, 2010::int),
      (1539::int, DATE '2010-12-18', 4::int, DATE '2010-12-18', 3::int, 2010::int, 2010::int),
      (513::int, DATE '2011-04-09', 5::int, DATE '2011-04-09', 3::int, 2011::int, 2011::int),
      (1608::int, DATE '2011-09-10', 4::int, DATE '2011-09-10', 1::int, 2011::int, 2011::int),
      (1604::int, DATE '2011-09-17', 5::int, DATE '2011-09-17', 8::int, 2011::int, 2011::int),
      (1595::int, DATE '2011-11-12', 10::int, DATE '2012-01-21', 2::int, 2011::int, 2012::int),
      (1592::int, DATE '2012-02-18', 3::int, DATE '2012-02-18', 2::int, 2012::int, 2012::int),
      (522::int, DATE '2012-03-03', 1::int, DATE '2012-03-03', 2::int, 2012::int, 2012::int),
      (1576::int, DATE '2012-08-25', 2::int, DATE '2012-08-25', 1::int, 2012::int, 2012::int),
      (1600::int, DATE '2012-09-01', 3::int, DATE '2012-09-01', 4::int, 2012::int, 2012::int),
      (531::int, DATE '2013-02-02', 6::int, DATE '2013-02-02', 4::int, 2013::int, 2013::int),
      (532::int, DATE '2013-03-02', 5::int, DATE '2013-03-02', 7::int, 2013::int, 2013::int),
      (1596::int, DATE '2013-09-28', 3::int, DATE '2013-09-28', 2::int, 2013::int, 2013::int),
      (1612::int, DATE '2013-10-12', 9::int, DATE '2013-10-12', 10::int, 2013::int, 2013::int),
      (1599::int, DATE '2014-09-06', 4::int, DATE '2014-09-06', 2::int, 2014::int, 2014::int),
      (1615::int, DATE '2014-09-20', 8::int, DATE '2014-09-20', 10::int, 2014::int, 2014::int),
      (553::int, DATE '2015-04-25', 12::int, DATE '2015-04-25', 6::int, 2015::int, 2015::int),
      (1597::int, DATE '2015-06-06', 1::int, DATE '2015-06-06', 7::int, 2015::int, 2015::int),
      (1618::int, DATE '2015-08-22', 3::int, DATE '2015-08-22', 4::int, 2015::int, 2015::int),
      (1622::int, DATE '2015-09-19', 1::int, DATE '2015-09-19', 2::int, 2015::int, 2015::int),
      (1619::int, DATE '2016-05-21', 10::int, DATE '2016-05-21', 1::int, 2016::int, 2016::int),
      (1593::int, DATE '2016-05-28', 1::int, DATE '2016-05-28', 10::int, 2016::int, 2016::int),
      (571::int, DATE '2017-01-21', 3::int, DATE '2017-01-21', 1::int, 2017::int, 2017::int),
      (1651::int, DATE '2017-01-28', 12::int, DATE '2017-01-28', 14::int, 2017::int, 2017::int),
      (1647::int, DATE '2018-04-21', 8::int, DATE '2018-04-21', 4::int, 2018::int, 2018::int),
      (583::int, DATE '2018-05-19', 2::int, DATE '2018-05-19', 4::int, 2018::int, 2018::int),
      (1652::int, DATE '2018-06-16', 1::int, DATE '2018-06-16', 2::int, 2018::int, 2018::int),
      (585::int, DATE '2018-07-07', 1::int, DATE '2018-07-07', 2::int, 2018::int, 2018::int),
      (1657::int, DATE '2018-11-17', 7::int, DATE '2018-11-17', 4::int, 2018::int, 2018::int),
      (588::int, DATE '2018-12-08', 1::int, DATE '2018-12-08', 4::int, 2018::int, 2018::int),
      (1716::int, DATE '2019-01-19', 1::int, DATE '2019-01-19', 2::int, 2019::int, 2019::int),
      (1656::int, DATE '2019-02-02', 8::int, DATE '2019-02-02', 5::int, 2019::int, 2019::int),
      (596::int, DATE '2019-09-07', 7::int, DATE '2019-09-07', 6::int, 2019::int, 2019::int),
      (599::int, DATE '2019-11-02', 3::int, DATE '2019-11-02', 1::int, 2019::int, 2019::int),
      (1644::int, DATE '2020-04-04', 4::int, DATE '2020-04-04', 2::int, 2020::int, 2020::int),
      (1660::int, DATE '2020-06-13', 7::int, DATE '2020-06-13', 2::int, 2020::int, 2020::int),
      (702::int, DATE '2020-08-22', 4::int, DATE '2020-08-22', 2::int, 2020::int, 2020::int),
      (1661::int, DATE '2020-09-05', 3::int, DATE '2020-09-05', 5::int, 2020::int, 2020::int),
      (704::int, DATE '2020-10-24', 8::int, DATE '2020-10-24', 4::int, 2020::int, 2020::int),
      (1655::int, DATE '2020-11-07', 1::int, DATE '2020-11-07', 4::int, 2020::int, 2020::int),
      (1691::int, DATE '2021-06-05', 10::int, DATE '2021-06-05', 7::int, 2021::int, 2021::int),
      (1690::int, DATE '2021-07-24', 1::int, DATE '2021-07-24', 3::int, 2021::int, 2021::int),
      (712::int, DATE '2021-08-14', 7::int, DATE '2021-08-14', 5::int, 2021::int, 2021::int),
      (1684::int, DATE '2021-09-18', 1::int, DATE '2021-09-18', 3::int, 2021::int, 2021::int),
      (1683::int, DATE '2021-10-30', 10::int, DATE '2021-10-30', 7::int, 2021::int, 2021::int),
      (1681::int, DATE '2021-11-27', 1::int, DATE '2021-11-27', 5::int, 2021::int, 2021::int),
      (1695::int, DATE '2022-04-16', 15::int, DATE '2022-04-16', 1::int, 2022::int, 2022::int),
      (1680::int, DATE '2022-11-05', 8::int, DATE '2022-11-05', 11::int, 2022::int, 2022::int),
      (1677::int, DATE '2023-01-28', 8::int, DATE '2023-01-28', 6::int, 2023::int, 2023::int),
      (1699::int, DATE '2023-03-18', 16::int, DATE '2023-03-18', 3::int, 2023::int, 2023::int),
      (730::int, DATE '2023-04-08', 1::int, DATE '2023-04-08', 3::int, 2023::int, 2023::int),
      (1700::int, DATE '2023-04-29', 1::int, DATE '2023-04-29', 11::int, 2023::int, 2023::int),
      (1688::int, DATE '2023-09-16', 3::int, DATE '2023-09-16', 2::int, 2023::int, 2023::int),
      (1679::int, DATE '2023-10-28', 4::int, DATE '2023-10-28', 2::int, 2023::int, 2023::int),
      (1678::int, DATE '2023-11-11', 1::int, DATE '2023-11-11', 3::int, 2023::int, 2023::int),
      (1696::int, DATE '2023-12-02', 6::int, DATE '2023-12-02', 3::int, 2023::int, 2023::int),
      (1686::int, DATE '2024-01-27', 1::int, DATE '2024-01-27', 2::int, 2024::int, 2024::int),
      (1703::int, DATE '2024-06-29', 1::int, DATE '2024-06-29', 2::int, 2024::int, 2024::int),
      (1701::int, DATE '2024-07-13', 19::int, DATE '2024-07-13', 16::int, 2024::int, 2024::int),
      (1682::int, DATE '2025-01-11', 5::int, DATE '2025-01-11', 4::int, 2025::int, 2025::int)
    ) AS t(song_id, new_date, new_weeks, old_date, old_weeks, new_year, old_year)
  ),
  updated_entries AS (
    UPDATE public.chart_entries ce
    SET chart_date = src.old_date,
        weeks_at_position = src.old_weeks
    FROM src
    WHERE ce.song_id = src.song_id
      AND ce.chart_date = src.new_date
      AND ce.weeks_at_position = src.new_weeks
    RETURNING ce.song_id
  ),
  updated_years AS (
    UPDATE public.songs s
    SET release_year = src.old_year
    FROM src
    WHERE s.id = src.song_id
      AND s.release_year = src.new_year
      AND src.old_year IS DISTINCT FROM src.new_year
    RETURNING s.id
  )
  SELECT
    (SELECT count(*) FROM updated_entries),
    (SELECT count(*) FROM updated_years)
  INTO updated_count, year_count;
  IF updated_count <> 108 THEN
    RAISE EXCEPTION 'chart date rollback changed % rows, expected 108', updated_count;
  END IF;
  IF year_count <> 4 THEN
    RAISE EXCEPTION 'release_year rollback changed % rows, expected 4', year_count;
  END IF;
END
$dates$;

INSERT INTO public.songs (id, title, artist_id, genre_id, release_year, owner_id) VALUES
  (501, 'Tik Tok', 323, 2, 2010, NULL),
  (965, 'Close to You', 78, 2, 1970, NULL),
  (1027, 'Give Me Love (Give Me Peace on Earth)', 112, 2, 1973, NULL),
  (1449, 'Candle in the Wind', 79, 2, 1997, NULL),
  (1457, 'Nice and Slow', 278, 2, 1998, NULL),
  (1668, 'Montero', 348, 2, 2021, NULL);

INSERT INTO public.chart_entries (id, song_id, position, chart_date, weeks_at_position) VALUES
  (501, 501, 1, DATE '2010-01-02', 9),
  (900, 965, 1, DATE '1970-07-25', 4),
  (939, 1027, 1, DATE '1973-06-30', 1),
  (1267, 1449, 1, DATE '1997-10-11', 14),
  (1270, 1457, 1, DATE '1998-02-14', 2),
  (1422, 1668, 1, DATE '2021-04-10', 1);

ALTER TABLE public.songs DROP CONSTRAINT songs_title_artist_id_release_year_key;
ALTER TABLE public.songs
  ADD CONSTRAINT songs_title_artist_id_key UNIQUE (title, artist_id);

SELECT setval('public.songs_id_seq', 1740, true);
SELECT setval('public.chart_entries_id_seq', 1472, true);
SELECT setval('public.artists_id_seq', 2378, true);

COMMIT;
