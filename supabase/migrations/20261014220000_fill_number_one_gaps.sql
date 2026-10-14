-- Fill missing No. 1 hits for 1958-2025 and correct duplicate rows.
-- Source: the English Wikipedia yearly number-one lists linked in
-- supabase/diffs/number_one_gap_diff.csv. Apply manually. This file
-- does not run by itself.
--
-- shared_playlists has no foreign key to songs, artists, or chart_entries.
-- The only foreign key that references songs is chart_entries.song_id.
-- Artist-less songs stay as they are; they are not in number_one_hits.
-- Songs that are not on these lists stay as they are.
--
-- A reign that continues into January keeps every week on the first
-- issue date, and release_year is that date's calendar year. A return
-- more than four months later is a separate song row (The Twist in 1962,
-- All I Want for Christmas Is You each December, Not Like Us in 2025),
-- so UNIQUE (title, artist_id) becomes UNIQUE (title, artist_id, release_year).
--
-- Named duplicates:
--   Big Girls Don't Cry: keep The Four Seasons (song 811) and set 5 weeks.
--     Move Fergie (song 479) to 2007-09-08, 1 week. Do not delete it.
--   One More Try: keep George Michael (song 1339) at 1988-05-28, 3 weeks.
--     Move Timmy T (song 315) to 1991-03-23, 1 week. Do not delete it.
--   Candle in the Wind: delete song 1449. Keep Candle in the Wind 1997 (song 380).
--   TiK ToK: delete Tik Tok (song 501). Keep TiK ToK (song 500).
-- The February 1970 Sly & the Family Stone single is stored as
-- Thank You (Falettinme Be Mice Elf Agin). Everybody Is a Star is the other side.
BEGIN;

DO $pre$
BEGIN
  IF (SELECT max(id) FROM public.songs) <> 1740 THEN
    RAISE EXCEPTION 'songs max id is %, expected 1740', (SELECT max(id) FROM public.songs);
  END IF;
  IF (SELECT max(id) FROM public.chart_entries) <> 1472 THEN
    RAISE EXCEPTION 'chart_entries max id is %, expected 1472', (SELECT max(id) FROM public.chart_entries);
  END IF;
  IF (SELECT max(id) FROM public.artists) <> 2364 THEN
    RAISE EXCEPTION 'artists max id is %, expected 2364', (SELECT max(id) FROM public.artists);
  END IF;
  IF (SELECT count(*) FROM public.songs) <> 1366
     OR (SELECT count(*) FROM public.chart_entries) <> 1366 THEN
    RAISE EXCEPTION 'song or chart entry row count changed';
  END IF;
  IF (SELECT last_value FROM public.artists_id_seq) <> 2378 THEN
    RAISE EXCEPTION 'artists_id_seq moved; new artist ids would collide';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.chart_entries ce ON ce.song_id = s.id
    JOIN public.artists a ON a.id = s.artist_id
    WHERE s.id = 479 AND a.name = 'Fergie' AND ce.chart_date = DATE '1962-11-17' AND ce.weeks_at_position = 6
  ) THEN
    RAISE EXCEPTION 'Fergie Big Girls Don''t Cry is not the 1962 duplicate';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.chart_entries ce ON ce.song_id = s.id
    JOIN public.artists a ON a.id = s.artist_id
    WHERE s.id = 315 AND a.name = 'Timmy T' AND ce.chart_date = DATE '1988-05-28'
  ) THEN
    RAISE EXCEPTION 'Timmy T One More Try is not on the 1988 date';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.artists a ON a.id = s.artist_id
    WHERE s.id = 501 AND s.title = 'Tik Tok' AND a.name = 'Kesha'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.songs s WHERE s.id = 1449 AND s.title = 'Candle in the Wind'
  ) THEN
    RAISE EXCEPTION 'Tik Tok or Candle in the Wind duplicate is not the reviewed row';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.confrelid = 'public.songs'::regclass
      AND t.relname <> 'chart_entries'
  ) THEN
    RAISE EXCEPTION 'a table other than chart_entries references songs';
  END IF;
END
$pre$;

ALTER TABLE public.songs DROP CONSTRAINT songs_title_artist_id_key;
ALTER TABLE public.songs
  ADD CONSTRAINT songs_title_artist_id_release_year_key
  UNIQUE (title, artist_id, release_year);

INSERT INTO public.artists (id, name, owner_id) VALUES
  (2379, 'Domenico Modugno', NULL),
  (2380, 'The Elegants', NULL),
  (2381, 'Tommy Edwards', NULL),
  (2382, 'Conway Twitty', NULL),
  (2383, 'The Kingston Trio', NULL),
  (2384, 'The Teddy Bears', NULL),
  (2385, 'The Chipmunks with David Seville', NULL),
  (2386, 'The Platters', NULL),
  (2387, 'Lloyd Price', NULL),
  (2388, 'Frankie Avalon', NULL),
  (2389, 'The Fleetwoods', NULL),
  (2390, 'Dave "Baby" Cortez', NULL),
  (2391, 'Wilbert Harrison', NULL),
  (2392, 'The Browns', NULL),
  (2393, 'Santo & Johnny', NULL),
  (2394, 'Guy Mitchell', NULL),
  (2395, 'The Dave Clark Five', NULL),
  (2396, 'Mac Davis', NULL),
  (2397, 'Paul Anka and Odia Coates', NULL),
  (2398, 'Johnny Mathis and Deniece Williams', NULL),
  (2399, 'Jan Hammer', NULL),
  (2400, 'Bananarama', NULL),
  (2401, 'Peter Cetera and Amy Grant', NULL),
  (2402, 'Bill Medley and Jennifer Warnes', NULL),
  (2403, 'Sheriff', NULL),
  (2404, 'Jon Bon Jovi', NULL),
  (2405, 'Nelson', NULL),
  (2406, 'Londonbeat', NULL),
  (2407, 'Marky Mark and the Funky Bunch featuring Loleatta Holloway', NULL),
  (2408, 'Divine', NULL),
  (2409, 'Nelly, P. Diddy and Murphy Lee', NULL),
  (2410, 'Carrie Underwood', NULL),
  (2411, 'James Blunt', NULL),
  (2412, 'Taylor Hicks', NULL),
  (2413, 'B.o.B featuring Bruno Mars', NULL),
  (2414, 'Shawn Mendes and Camila Cabello', NULL),
  (2415, 'The Scotts, Travis Scott and Kid Cudi', NULL),
  (2416, 'Ariana Grande and Justin Bieber', NULL),
  (2417, 'Megan Thee Stallion featuring Beyoncé', NULL),
  (2418, 'Lady Gaga and Ariana Grande', NULL),
  (2419, '6ix9ine and Nicki Minaj', NULL),
  (2420, 'Polo G', NULL),
  (2421, 'The Weeknd and Ariana Grande', NULL),
  (2422, 'Coldplay and BTS', NULL),
  (2423, 'Oliver Anthony Music', NULL),
  (2424, 'Zach Bryan featuring Kacey Musgraves', NULL),
  (2425, 'Megan Thee Stallion', NULL),
  (2426, '¥$: Ye and Ty Dolla Sign featuring Rich the Kid and Playboi Carti', NULL),
  (2427, 'Future, Metro Boomin and Kendrick Lamar', NULL),
  (2428, 'Kendrick Lamar and SZA', NULL),
  (2429, 'Alex Warren', NULL),
  (2430, 'Huntrix: Ejae, Audrey Nuna and Rei Ami', NULL),
  (2431, 'The Essex', NULL),
  (2432, 'Jimmy Gilmer and the Fireballs', NULL),
  (2433, '? and the Mysterians', NULL),
  (2434, 'Johnny Rivers', NULL),
  (2435, 'Peter, Paul and Mary', NULL);

DO $artists$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 824
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'Jimmy Dean'
    AND target.name = 'Jimmy Soul';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 824 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 821
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The Shirelles'
    AND target.name = 'The Essex';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 821 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 823
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'Jimmy Dean'
    AND target.name = 'Jimmy Gilmer and the Fireballs';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 823 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 862
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The Four Seasons'
    AND target.name = 'The Four Tops';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 862 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 897
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The Lovin'' Spoonful'
    AND target.name = 'The Mamas and the Papas';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 897 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 860
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The Four Seasons'
    AND target.name = 'The Four Tops';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 860 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 889
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The McCoys'
    AND target.name = '? and the Mysterians';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 889 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 876
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'The Righteous Brothers'
    AND target.name = 'Johnny Rivers';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 876 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 944
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'Bobby Gentry'
    AND target.name = 'Bobbie Gentry';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 944 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 928
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'Peter and Gordon'
    AND target.name = 'Peter, Paul and Mary';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 928 updated % rows', updated_count;
  END IF;
  UPDATE public.songs s
  SET artist_id = target.id
  FROM public.artists current_artist, public.artists target
  WHERE s.id = 1740
    AND s.artist_id = current_artist.id
    AND current_artist.name = 'Fifty Cent'
    AND target.name = '50 Cent';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'artist retarget for song 1740 updated % rows', updated_count;
  END IF;
END
$artists$;

DO $dates$
DECLARE
  updated_count integer;
  year_count integer;
BEGIN
  WITH src AS (
    SELECT * FROM (VALUES
      (770::int, DATE '1960-09-19', 3::int, DATE '1960-09-19', 1::int, 1960::int, 1960::int),
      (479::int, DATE '1962-11-17', 6::int, DATE '2007-09-08', 1::int, 1962::int, 2007::int),
      (811::int, DATE '1962-11-17', 6::int, DATE '1962-11-17', 5::int, 1962::int, 1962::int),
      (824::int, DATE '1963-05-18', 2::int, DATE '1963-05-18', 2::int, 1963::int, 1963::int),
      (821::int, DATE '1963-07-06', 2::int, DATE '1963-07-06', 2::int, 1963::int, 1963::int),
      (823::int, DATE '1963-10-12', 5::int, DATE '1963-10-12', 5::int, 1963::int, 1963::int),
      (862::int, DATE '1965-06-19', 2::int, DATE '1965-06-19', 2::int, 1965::int, 1965::int),
      (879::int, DATE '1966-02-05', 5::int, DATE '1966-02-05', 2::int, 1966::int, 1966::int),
      (1554::int, DATE '1966-02-05', 5::int, DATE '2006-11-11', 3::int, 1966::int, 2006::int),
      (897::int, DATE '1966-05-07', 3::int, DATE '1966-05-07', 3::int, 1966::int, 1966::int),
      (860::int, DATE '1966-10-15', 2::int, DATE '1966-10-15', 2::int, 1966::int, 1966::int),
      (889::int, DATE '1966-10-29', 1::int, DATE '1966-10-29', 1::int, 1966::int, 1966::int),
      (876::int, DATE '1966-11-12', 1::int, DATE '1966-11-12', 1::int, 1966::int, 1966::int),
      (944::int, DATE '1967-08-26', 4::int, DATE '1967-08-26', 4::int, 1967::int, 1967::int),
      (928::int, DATE '1969-12-20', 1::int, DATE '1969-12-20', 1::int, 1969::int, 1969::int),
      (1244::int, DATE '1983-01-15', 3::int, DATE '1983-01-15', 4::int, 1983::int, 1983::int),
      (132::int, DATE '1983-02-05', 2::int, DATE '1983-02-05', 1::int, 1983::int, 1983::int),
      (315::int, DATE '1988-05-28', 4::int, DATE '1991-03-23', 1::int, 1988::int, 1991::int),
      (1339::int, DATE '1988-05-28', 4::int, DATE '1988-05-28', 3::int, 1988::int, 1988::int),
      (1443::int, DATE '1994-03-12', 4::int, DATE '1994-03-12', 6::int, 1994::int, 1994::int),
      (343::int, DATE '1994-04-09', 6::int, DATE '1994-04-09', 4::int, 1994::int, 1994::int),
      (1432::int, DATE '1994-12-03', 5::int, DATE '1994-12-03', 6::int, 1994::int, 1994::int),
      (351::int, DATE '1994-12-17', 3::int, DATE '1994-12-17', 2::int, 1994::int, 1994::int),
      (385::int, DATE '1998-04-25', 4::int, DATE '1998-04-25', 5::int, 1998::int, 1998::int),
      (1477::int, DATE '1998-10-03', 2::int, DATE '1998-10-03', 5::int, 1998::int, 1998::int),
      (389::int, DATE '1998-10-17', 4::int, DATE '1998-10-17', 1::int, 1998::int, 1998::int),
      (402::int, DATE '2000-01-29', 3::int, DATE '2000-01-29', 4::int, 2000::int, 2000::int),
      (1511::int, DATE '2001-03-24', 1::int, DATE '2001-03-24', 2::int, 2001::int, 2001::int),
      (1490::int, DATE '2001-03-31', 2::int, DATE '2001-03-31', 1::int, 2001::int, 2001::int),
      (1514::int, DATE '2001-08-18', 3::int, DATE '2001-08-18', 6::int, 2001::int, 2001::int),
      (418::int, DATE '2001-09-08', 8::int, DATE '2001-09-08', 5::int, 2001::int, 2001::int),
      (1525::int, DATE '2002-08-17', 7::int, DATE '2002-08-17', 10::int, 2002::int, 2002::int),
      (444::int, DATE '2004-05-22', 7::int, DATE '2004-05-22', 8::int, 2004::int, 2004::int),
      (446::int, DATE '2004-07-10', 2::int, DATE '2004-07-10', 1::int, 2004::int, 2004::int),
      (1740::int, DATE '2005-03-05', 9::int, DATE '2005-03-05', 9::int, 2005::int, 2005::int),
      (1497::int, DATE '2005-06-04', 4::int, DATE '2005-06-04', 14::int, 2005::int, 2005::int),
      (1567::int, DATE '2007-05-12', 2::int, DATE '2007-05-12', 3::int, 2007::int, 2007::int),
      (1570::int, DATE '2007-09-15', 2::int, DATE '2007-09-15', 7::int, 2007::int, 2007::int),
      (1563::int, DATE '2007-09-29', 6::int, DATE '2007-09-29', 1::int, 2007::int, 2007::int),
      (483::int, DATE '2008-04-05', 1::int, DATE '2008-04-05', 4::int, 2008::int, 2008::int),
      (1545::int, DATE '2008-04-12', 3::int, DATE '2008-04-12', 2::int, 2008::int, 2008::int),
      (485::int, DATE '2008-05-03', 3::int, DATE '2008-05-03', 5::int, 2008::int, 2008::int),
      (488::int, DATE '2008-09-06', 3::int, DATE '2008-09-06', 7::int, 2008::int, 2008::int),
      (490::int, DATE '2008-10-18', 1::int, DATE '2008-10-18', 6::int, 2008::int, 2008::int),
      (1549::int, DATE '2008-12-13', 5::int, DATE '2008-12-13', 4::int, 2008::int, 2008::int),
      (498::int, DATE '2009-10-17', 1::int, DATE '2009-10-17', 2::int, 2009::int, 2009::int),
      (506::int, DATE '2010-05-15', 1::int, DATE '2010-05-15', 4::int, 2010::int, 2010::int),
      (1547::int, DATE '2010-05-22', 4::int, DATE '2010-05-22', 1::int, 2010::int, 2010::int),
      (1566::int, DATE '2010-10-30', 2::int, DATE '2010-10-30', 3::int, 2010::int, 2010::int),
      (1539::int, DATE '2010-12-18', 3::int, DATE '2010-12-18', 4::int, 2010::int, 2010::int),
      (513::int, DATE '2011-04-09', 3::int, DATE '2011-04-09', 5::int, 2011::int, 2011::int),
      (1608::int, DATE '2011-09-10', 1::int, DATE '2011-09-10', 4::int, 2011::int, 2011::int),
      (1604::int, DATE '2011-09-17', 8::int, DATE '2011-09-17', 5::int, 2011::int, 2011::int),
      (1595::int, DATE '2012-01-21', 2::int, DATE '2011-11-12', 10::int, 2012::int, 2011::int),
      (1592::int, DATE '2012-02-18', 2::int, DATE '2012-02-18', 3::int, 2012::int, 2012::int),
      (522::int, DATE '2012-03-03', 2::int, DATE '2012-03-03', 1::int, 2012::int, 2012::int),
      (1576::int, DATE '2012-08-25', 1::int, DATE '2012-08-25', 2::int, 2012::int, 2012::int),
      (1600::int, DATE '2012-09-01', 4::int, DATE '2012-09-01', 3::int, 2012::int, 2012::int),
      (531::int, DATE '2013-02-02', 4::int, DATE '2013-02-02', 6::int, 2013::int, 2013::int),
      (532::int, DATE '2013-03-02', 7::int, DATE '2013-03-02', 5::int, 2013::int, 2013::int),
      (1596::int, DATE '2013-09-28', 2::int, DATE '2013-09-28', 3::int, 2013::int, 2013::int),
      (1612::int, DATE '2013-10-12', 10::int, DATE '2013-10-12', 9::int, 2013::int, 2013::int),
      (1599::int, DATE '2014-09-06', 2::int, DATE '2014-09-06', 4::int, 2014::int, 2014::int),
      (1615::int, DATE '2014-09-20', 10::int, DATE '2014-09-20', 8::int, 2014::int, 2014::int),
      (553::int, DATE '2015-04-25', 6::int, DATE '2015-04-25', 12::int, 2015::int, 2015::int),
      (1597::int, DATE '2015-06-06', 7::int, DATE '2015-06-06', 1::int, 2015::int, 2015::int),
      (1618::int, DATE '2015-08-22', 4::int, DATE '2015-08-22', 3::int, 2015::int, 2015::int),
      (1622::int, DATE '2015-09-19', 2::int, DATE '2015-09-19', 1::int, 2015::int, 2015::int),
      (1619::int, DATE '2016-05-21', 1::int, DATE '2016-05-21', 10::int, 2016::int, 2016::int),
      (1593::int, DATE '2016-05-28', 10::int, DATE '2016-05-28', 1::int, 2016::int, 2016::int),
      (571::int, DATE '2017-01-21', 1::int, DATE '2017-01-21', 3::int, 2017::int, 2017::int),
      (1651::int, DATE '2017-01-28', 14::int, DATE '2017-01-28', 12::int, 2017::int, 2017::int),
      (1647::int, DATE '2018-04-21', 4::int, DATE '2018-04-21', 8::int, 2018::int, 2018::int),
      (583::int, DATE '2018-05-19', 4::int, DATE '2018-05-19', 2::int, 2018::int, 2018::int),
      (1652::int, DATE '2018-06-16', 2::int, DATE '2018-06-16', 1::int, 2018::int, 2018::int),
      (585::int, DATE '2018-07-07', 2::int, DATE '2018-07-07', 1::int, 2018::int, 2018::int),
      (1657::int, DATE '2018-11-17', 4::int, DATE '2018-11-17', 7::int, 2018::int, 2018::int),
      (588::int, DATE '2018-12-08', 4::int, DATE '2018-12-08', 1::int, 2018::int, 2018::int),
      (1716::int, DATE '2019-01-19', 2::int, DATE '2019-01-19', 1::int, 2019::int, 2019::int),
      (1656::int, DATE '2019-02-02', 5::int, DATE '2019-02-02', 8::int, 2019::int, 2019::int),
      (596::int, DATE '2019-09-07', 6::int, DATE '2019-09-07', 7::int, 2019::int, 2019::int),
      (599::int, DATE '2019-11-02', 1::int, DATE '2019-11-02', 3::int, 2019::int, 2019::int),
      (1644::int, DATE '2020-04-04', 2::int, DATE '2020-04-04', 4::int, 2020::int, 2020::int),
      (1660::int, DATE '2020-06-13', 2::int, DATE '2020-06-13', 7::int, 2020::int, 2020::int),
      (702::int, DATE '2020-08-22', 2::int, DATE '2020-08-22', 4::int, 2020::int, 2020::int),
      (1661::int, DATE '2020-09-05', 5::int, DATE '2020-09-05', 3::int, 2020::int, 2020::int),
      (704::int, DATE '2020-10-24', 4::int, DATE '2020-10-24', 8::int, 2020::int, 2020::int),
      (1655::int, DATE '2020-11-07', 4::int, DATE '2020-11-07', 1::int, 2020::int, 2020::int),
      (1691::int, DATE '2021-06-05', 7::int, DATE '2021-06-05', 10::int, 2021::int, 2021::int),
      (1690::int, DATE '2021-07-24', 3::int, DATE '2021-07-24', 1::int, 2021::int, 2021::int),
      (712::int, DATE '2021-08-14', 5::int, DATE '2021-08-14', 7::int, 2021::int, 2021::int),
      (1684::int, DATE '2021-09-18', 3::int, DATE '2021-09-18', 1::int, 2021::int, 2021::int),
      (1683::int, DATE '2021-10-30', 7::int, DATE '2021-10-30', 10::int, 2021::int, 2021::int),
      (1681::int, DATE '2021-11-27', 5::int, DATE '2021-11-27', 1::int, 2021::int, 2021::int),
      (1695::int, DATE '2022-04-16', 1::int, DATE '2022-04-16', 15::int, 2022::int, 2022::int),
      (1680::int, DATE '2022-11-05', 11::int, DATE '2022-11-05', 8::int, 2022::int, 2022::int),
      (1677::int, DATE '2023-01-28', 6::int, DATE '2023-01-28', 8::int, 2023::int, 2023::int),
      (1699::int, DATE '2023-03-18', 3::int, DATE '2023-03-18', 16::int, 2023::int, 2023::int),
      (730::int, DATE '2023-04-08', 3::int, DATE '2023-04-08', 1::int, 2023::int, 2023::int),
      (1700::int, DATE '2023-04-29', 11::int, DATE '2023-04-29', 1::int, 2023::int, 2023::int),
      (1688::int, DATE '2023-09-16', 2::int, DATE '2023-09-16', 3::int, 2023::int, 2023::int),
      (1679::int, DATE '2023-10-28', 2::int, DATE '2023-10-28', 4::int, 2023::int, 2023::int),
      (1678::int, DATE '2023-11-11', 3::int, DATE '2023-11-11', 1::int, 2023::int, 2023::int),
      (1696::int, DATE '2023-12-02', 3::int, DATE '2023-12-02', 6::int, 2023::int, 2023::int),
      (1686::int, DATE '2024-01-27', 2::int, DATE '2024-01-27', 1::int, 2024::int, 2024::int),
      (1703::int, DATE '2024-06-29', 2::int, DATE '2024-06-29', 1::int, 2024::int, 2024::int),
      (1701::int, DATE '2024-07-13', 16::int, DATE '2024-07-13', 19::int, 2024::int, 2024::int),
      (1682::int, DATE '2025-01-11', 4::int, DATE '2025-01-11', 5::int, 2025::int, 2025::int)
    ) AS t(song_id, old_date, old_weeks, new_date, new_weeks, old_year, new_year)
  ),
  updated_entries AS (
    UPDATE public.chart_entries ce
    SET chart_date = src.new_date,
        weeks_at_position = src.new_weeks
    FROM src
    WHERE ce.song_id = src.song_id
      AND ce.chart_date = src.old_date
      AND ce.weeks_at_position = src.old_weeks
    RETURNING ce.song_id
  ),
  updated_years AS (
    UPDATE public.songs s
    SET release_year = src.new_year
    FROM src
    WHERE s.id = src.song_id
      AND s.release_year = src.old_year
      AND src.new_year IS DISTINCT FROM src.old_year
    RETURNING s.id
  )
  SELECT
    (SELECT count(*) FROM updated_entries),
    (SELECT count(*) FROM updated_years)
  INTO updated_count, year_count;
  IF updated_count <> 108 THEN
    RAISE EXCEPTION 'chart date updates changed % rows, expected 108', updated_count;
  END IF;
  IF year_count <> 4 THEN
    RAISE EXCEPTION 'release_year updates changed % rows, expected 4', year_count;
  END IF;
END
$dates$;

DO $remove$
DECLARE
  removed_count integer;
BEGIN
  DELETE FROM public.chart_entries
  WHERE (id, song_id) IN (
    (501, 501),
    (900, 965),
    (939, 1027),
    (1267, 1449),
    (1270, 1457),
    (1422, 1668)
  );
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 6 THEN
    RAISE EXCEPTION 'duplicate chart entries removed % rows, expected 6', removed_count;
  END IF;
  DELETE FROM public.songs
  WHERE id IN (501, 965, 1027, 1449, 1457, 1668);
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 6 THEN
    RAISE EXCEPTION 'duplicate songs removed % rows, expected 6', removed_count;
  END IF;
END
$remove$;

INSERT INTO public.songs (id, title, artist_id, genre_id, release_year, owner_id) VALUES
  (1741, 'Poor Little Fool', (SELECT id FROM public.artists WHERE name = 'Ricky Nelson'), 2, 1958, NULL),
  (1742, 'Volare (Nel blu dipinto di blu)', 2379, 2, 1958, NULL),
  (1743, 'Little Star', 2380, 2, 1958, NULL),
  (1744, 'It''s All in the Game', 2381, 2, 1958, NULL),
  (1745, 'It''s Only Make Believe', 2382, 2, 1958, NULL),
  (1746, 'Tom Dooley', 2383, 2, 1958, NULL),
  (1747, 'To Know Him Is to Love Him', 2384, 2, 1958, NULL),
  (1748, 'The Chipmunk Song (Christmas Don''t Be Late)', 2385, 2, 1958, NULL),
  (1749, 'Smoke Gets in Your Eyes', 2386, 2, 1959, NULL),
  (1750, 'Stagger Lee', 2387, 2, 1959, NULL),
  (1751, 'Venus', 2388, 2, 1959, NULL),
  (1752, 'Come Softly to Me', 2389, 2, 1959, NULL),
  (1753, 'The Happy Organ', 2390, 2, 1959, NULL),
  (1754, 'Kansas City', 2391, 2, 1959, NULL),
  (1755, 'The Battle of New Orleans', (SELECT id FROM public.artists WHERE name = 'Johnny Horton'), 2, 1959, NULL),
  (1756, 'Lonely Boy', (SELECT id FROM public.artists WHERE name = 'Paul Anka'), 2, 1959, NULL),
  (1757, 'A Big Hunk o'' Love', (SELECT id FROM public.artists WHERE name = 'Elvis Presley'), 2, 1959, NULL),
  (1758, 'The Three Bells', 2392, 2, 1959, NULL),
  (1759, 'Sleep Walk', 2393, 2, 1959, NULL),
  (1760, 'Mack the Knife', (SELECT id FROM public.artists WHERE name = 'Bobby Darin'), 2, 1959, NULL),
  (1761, 'Mr. Blue', 2389, 2, 1959, NULL),
  (1762, 'Heartaches by the Number', 2394, 2, 1959, NULL),
  (1763, 'Why', 2388, 2, 1959, NULL),
  (1764, 'The Twist', (SELECT id FROM public.artists WHERE name = 'Chubby Checker'), 2, 1962, NULL),
  (1765, 'I''m Henry VIII, I Am', (SELECT id FROM public.artists WHERE name = 'Herman''s Hermits'), 2, 1965, NULL),
  (1766, 'Over and Over', 2395, 2, 1965, NULL),
  (1767, 'Venus', (SELECT id FROM public.artists WHERE name = 'Shocking Blue'), 2, 1970, NULL),
  (1768, 'Thank You (Falettinme Be Mice Elf Agin)', (SELECT id FROM public.artists WHERE name = 'Sly & The Family Stone'), 2, 1970, NULL),
  (1769, 'Bridge over Troubled Water', (SELECT id FROM public.artists WHERE name = 'Simon and Garfunkel'), 2, 1970, NULL),
  (1770, 'Let It Be', (SELECT id FROM public.artists WHERE name = 'The Beatles'), 2, 1970, NULL),
  (1771, 'You''ve Got a Friend', (SELECT id FROM public.artists WHERE name = 'James Taylor'), 2, 1971, NULL),
  (1772, 'Brand New Key', (SELECT id FROM public.artists WHERE name = 'Melanie'), 2, 1971, NULL),
  (1773, 'Heart of Gold', (SELECT id FROM public.artists WHERE name = 'Neil Young'), 2, 1972, NULL),
  (1774, 'Baby, Don''t Get Hooked on Me', 2396, 2, 1972, NULL),
  (1775, 'Brother Louie', (SELECT id FROM public.artists WHERE name = 'Stories'), 2, 1973, NULL),
  (1776, 'Midnight Train to Georgia', (SELECT id FROM public.artists WHERE name = 'Gladys Knight and the Pips'), 2, 1973, NULL),
  (1777, 'Keep on Truckin', (SELECT id FROM public.artists WHERE name = 'Eddie Kendricks'), 2, 1973, NULL),
  (1778, 'Show and Tell', (SELECT id FROM public.artists WHERE name = 'Al Wilson'), 2, 1974, NULL),
  (1779, '(You''re) Having My Baby', 2397, 2, 1974, NULL),
  (1780, 'Can''t Get Enough of Your Love, Babe', (SELECT id FROM public.artists WHERE name = 'Barry White'), 2, 1974, NULL),
  (1781, 'You Ain''t Seen Nothing Yet', (SELECT id FROM public.artists WHERE name = 'Bachman-Turner Overdrive'), 2, 1974, NULL),
  (1782, 'Cat''s in the Cradle', (SELECT id FROM public.artists WHERE name = 'Harry Chapin'), 2, 1974, NULL),
  (1783, 'Fallin'' in Love', (SELECT id FROM public.artists WHERE name = 'Hamilton Joe Frank and Reynolds'), 2, 1975, NULL),
  (1784, 'Star Wars Theme/Cantina Band', (SELECT id FROM public.artists WHERE name = 'Meco'), 2, 1977, NULL),
  (1785, 'Too Much, Too Little, Too Late', 2398, 2, 1978, NULL),
  (1786, 'Please Don''t Go', (SELECT id FROM public.artists WHERE name = 'KC and the Sunshine Band'), 2, 1980, NULL),
  (1787, 'Morning Train (Nine to Five)', (SELECT id FROM public.artists WHERE name = 'Sheena Easton'), 2, 1981, NULL),
  (1788, 'Up Where We Belong', (SELECT id FROM public.artists WHERE name = 'Joe Cocker and Jennifer Warnes'), 2, 1982, NULL),
  (1789, 'Mickey', (SELECT id FROM public.artists WHERE name = 'Toni Basil'), 2, 1982, NULL),
  (1790, 'Maniac', (SELECT id FROM public.artists WHERE name = 'Michael Sembello'), 2, 1983, NULL),
  (1791, 'Say Say Say', (SELECT id FROM public.artists WHERE name = 'Paul McCartney and Michael Jackson'), 2, 1983, NULL),
  (1792, 'Can''t Fight This Feeling', (SELECT id FROM public.artists WHERE name = 'REO Speedwagon'), 2, 1985, NULL),
  (1793, 'Oh Sheila', (SELECT id FROM public.artists WHERE name = 'Ready for the World'), 2, 1985, NULL),
  (1794, 'Miami Vice Theme', 2399, 2, 1985, NULL),
  (1795, 'These Dreams', (SELECT id FROM public.artists WHERE name = 'Heart'), 1, 1986, NULL),
  (1796, 'West End Girls', (SELECT id FROM public.artists WHERE name = 'Pet Shop Boys'), 2, 1986, NULL),
  (1797, 'On My Own', (SELECT id FROM public.artists WHERE name = 'Patti LaBelle and Michael McDonald'), 2, 1986, NULL),
  (1798, 'Venus', 2400, 2, 1986, NULL),
  (1799, 'When I Think of You', (SELECT id FROM public.artists WHERE name = 'Janet Jackson'), 2, 1986, NULL),
  (1800, 'The Next Time I Fall', 2401, 2, 1986, NULL),
  (1801, 'The Way It Is', (SELECT id FROM public.artists WHERE name = 'Bruce Hornsby and the Range'), 2, 1986, NULL),
  (1802, 'You Keep Me Hangin'' On', (SELECT id FROM public.artists WHERE name = 'Kim Wilde'), 2, 1987, NULL),
  (1803, 'Shakedown', (SELECT id FROM public.artists WHERE name = 'Bob Seger'), 2, 1987, NULL),
  (1804, 'I Think We''re Alone Now', (SELECT id FROM public.artists WHERE name = 'Tiffany'), 2, 1987, NULL),
  (1805, '(I''ve Had) The Time of My Life', 2402, 2, 1987, NULL),
  (1806, 'Heaven Is a Place on Earth', (SELECT id FROM public.artists WHERE name = 'Belinda Carlisle'), 2, 1987, NULL),
  (1807, 'So Emotional', (SELECT id FROM public.artists WHERE name = 'Whitney Houston'), 2, 1988, NULL),
  (1808, 'Got My Mind Set on You', (SELECT id FROM public.artists WHERE name = 'George Harrison'), 1, 1988, NULL),
  (1809, 'The Way You Make Me Feel', (SELECT id FROM public.artists WHERE name = 'Michael Jackson'), 2, 1988, NULL),
  (1810, 'Could''ve Been', (SELECT id FROM public.artists WHERE name = 'Tiffany'), 2, 1988, NULL),
  (1811, 'Seasons Change', (SELECT id FROM public.artists WHERE name = 'Expose'), 2, 1988, NULL),
  (1812, 'Sweet Child o'' Mine', (SELECT id FROM public.artists WHERE name = 'Guns N'' Roses'), 2, 1988, NULL),
  (1813, 'Bad Medicine', (SELECT id FROM public.artists WHERE name = 'Bon Jovi'), 2, 1988, NULL),
  (1814, 'Freebird Medley', (SELECT id FROM public.artists WHERE name = 'Will to Power'), 2, 1988, NULL),
  (1815, 'Look Away', (SELECT id FROM public.artists WHERE name = 'Chicago'), 2, 1988, NULL),
  (1816, 'When I''m with You', 2403, 2, 1989, NULL),
  (1817, 'Rock On', (SELECT id FROM public.artists WHERE name = 'Michael Damian'), 2, 1989, NULL),
  (1818, 'I''ll Be Loving You (Forever)', (SELECT id FROM public.artists WHERE name = 'New Kids on the Block'), 2, 1989, NULL),
  (1819, 'Satisfied', (SELECT id FROM public.artists WHERE name = 'Richard Marx'), 2, 1989, NULL),
  (1820, 'Baby Don''t Forget My Number', (SELECT id FROM public.artists WHERE name = 'Milli Vanilli'), 2, 1989, NULL),
  (1821, 'Good Thing', (SELECT id FROM public.artists WHERE name = 'Fine Young Cannibals'), 2, 1989, NULL),
  (1822, 'If You Don''t Know Me by Now', (SELECT id FROM public.artists WHERE name = 'Simply Red'), 2, 1989, NULL),
  (1823, 'Don''t Wanna Lose You', (SELECT id FROM public.artists WHERE name = 'Gloria Estefan'), 2, 1989, NULL),
  (1824, 'When I See You Smile', (SELECT id FROM public.artists WHERE name = 'Bad English'), 2, 1989, NULL),
  (1825, 'I''ll Be Your Everything', (SELECT id FROM public.artists WHERE name = 'Tommy Page'), 2, 1990, NULL),
  (1826, 'It Must Have Been Love', (SELECT id FROM public.artists WHERE name = 'Roxette'), 2, 1990, NULL),
  (1827, 'If Wishes Came True', (SELECT id FROM public.artists WHERE name = 'Sweet Sensation'), 2, 1990, NULL),
  (1828, 'Blaze of Glory', 2404, 2, 1990, NULL),
  (1829, '(Can''t Live Without Your) Love and Affection', 2405, 2, 1990, NULL),
  (1830, 'Close to You', (SELECT id FROM public.artists WHERE name = 'Maxi Priest'), 2, 1990, NULL),
  (1831, 'I Don''t Have the Heart', (SELECT id FROM public.artists WHERE name = 'James Ingram'), 2, 1990, NULL),
  (1832, 'Because I Love You (The Postman Song)', (SELECT id FROM public.artists WHERE name = 'Stevie B'), 2, 1990, NULL),
  (1833, 'Love Will Never Do (Without You)', (SELECT id FROM public.artists WHERE name = 'Janet Jackson'), 2, 1991, NULL),
  (1834, 'All the Man That I Need', (SELECT id FROM public.artists WHERE name = 'Whitney Houston'), 2, 1991, NULL),
  (1835, 'Coming Out of the Dark', (SELECT id FROM public.artists WHERE name = 'Gloria Estefan'), 2, 1991, NULL),
  (1836, 'I''ve Been Thinking About You', 2406, 2, 1991, NULL),
  (1837, 'You''re in Love', (SELECT id FROM public.artists WHERE name = 'Wilson Phillips'), 2, 1991, NULL),
  (1838, 'Joyride', (SELECT id FROM public.artists WHERE name = 'Roxette'), 2, 1991, NULL),
  (1839, 'I Like the Way (The Kissing Game)', (SELECT id FROM public.artists WHERE name = 'Hi-Five'), 2, 1991, NULL),
  (1840, 'I Don''t Wanna Cry', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 1991, NULL),
  (1841, 'More Than Words', (SELECT id FROM public.artists WHERE name = 'Extreme'), 2, 1991, NULL),
  (1842, 'The Promise of a New Day', (SELECT id FROM public.artists WHERE name = 'Paula Abdul'), 2, 1991, NULL),
  (1843, 'I Adore Mi Amor', (SELECT id FROM public.artists WHERE name = 'Color Me Badd'), 2, 1991, NULL),
  (1844, 'Good Vibrations', 2407, 2, 1991, NULL),
  (1845, 'Romantic', (SELECT id FROM public.artists WHERE name = 'Karyn White'), 2, 1991, NULL),
  (1846, 'I''ll Be There', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 1992, NULL),
  (1847, 'Weak', (SELECT id FROM public.artists WHERE name = 'SWV'), 2, 1993, NULL),
  (1848, 'This Is How We Do It', (SELECT id FROM public.artists WHERE name = 'Montell Jordan'), 2, 1995, NULL),
  (1849, 'Have You Ever Really Loved a Woman?', (SELECT id FROM public.artists WHERE name = 'Bryan Adams'), 2, 1995, NULL),
  (1850, '4 Seasons of Loneliness', (SELECT id FROM public.artists WHERE name = 'Boyz II Men'), 2, 1997, NULL),
  (1851, 'All My Life', (SELECT id FROM public.artists WHERE name = 'K-Ci and JoJo'), 2, 1998, NULL),
  (1852, 'My All', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 1998, NULL),
  (1853, 'Lately', 2408, 2, 1998, NULL),
  (1854, 'I''m Your Angel', (SELECT id FROM public.artists WHERE name = 'R. Kelly and Celine Dion'), 2, 1998, NULL),
  (1855, 'Wild Wild West', (SELECT id FROM public.artists WHERE name = 'Will Smith'), 2, 1999, NULL),
  (1856, 'Bailamos', (SELECT id FROM public.artists WHERE name = 'Enrique Iglesias'), 2, 1999, NULL),
  (1857, 'Thank God I Found You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2000, NULL),
  (1858, 'Be with You', (SELECT id FROM public.artists WHERE name = 'Enrique Iglesias'), 2, 2000, NULL),
  (1859, 'It''s Gonna Be Me', (SELECT id FROM public.artists WHERE name = 'NSYNC'), 2, 2000, NULL),
  (1860, 'Incomplete', (SELECT id FROM public.artists WHERE name = 'Sisqo'), 2, 2000, NULL),
  (1861, 'Ms. Jackson', (SELECT id FROM public.artists WHERE name = 'OutKast'), 2, 2001, NULL),
  (1862, 'Always on Time', (SELECT id FROM public.artists WHERE name = 'Ja Rule featuring Ashanti'), 2, 2002, NULL),
  (1863, 'A Moment Like This', (SELECT id FROM public.artists WHERE name = 'Kelly Clarkson'), 2, 2002, NULL),
  (1864, 'All I Have', (SELECT id FROM public.artists WHERE name = 'Jennifer Lopez'), 2, 2003, NULL),
  (1865, 'In da Club', (SELECT id FROM public.artists WHERE name = '50 Cent'), 2, 2003, NULL),
  (1866, '21 Questions', (SELECT id FROM public.artists WHERE name = '50 Cent'), 2, 2003, NULL),
  (1867, 'Shake Ya Tailfeather', 2409, 2, 2003, NULL),
  (1868, 'Baby Boy', (SELECT id FROM public.artists WHERE name = 'Beyonce'), 2, 2003, NULL),
  (1869, 'Stand Up', (SELECT id FROM public.artists WHERE name = 'Ludacris'), 2, 2003, NULL),
  (1870, 'The Way You Move', (SELECT id FROM public.artists WHERE name = 'OutKast'), 2, 2004, NULL),
  (1871, 'Slow Jamz', (SELECT id FROM public.artists WHERE name = 'Twista'), 2, 2004, NULL),
  (1872, 'Inside Your Heaven', 2410, 2, 2005, NULL),
  (1873, 'Don''t Forget About Us', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2005, NULL),
  (1874, 'Laffy Taffy', (SELECT id FROM public.artists WHERE name = 'D4L'), 2, 2006, NULL),
  (1875, 'Grillz', (SELECT id FROM public.artists WHERE name = 'Nelly'), 2, 2006, NULL),
  (1876, 'You''re Beautiful', 2411, 2, 2006, NULL),
  (1877, 'SOS', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2006, NULL),
  (1878, 'Do I Make You Proud', 2412, 2, 2006, NULL),
  (1879, 'Money Maker', (SELECT id FROM public.artists WHERE name = 'Ludacris'), 2, 2006, NULL),
  (1880, 'I Wanna Love You', (SELECT id FROM public.artists WHERE name = 'Akon'), 3, 2006, NULL),
  (1881, 'Say It Right', (SELECT id FROM public.artists WHERE name = 'Nelly Furtado'), 2, 2007, NULL),
  (1882, 'Buy U a Drank (Shawty Snappin'')', (SELECT id FROM public.artists WHERE name = 'T-Pain featuring Yung Joc'), 2, 2007, NULL),
  (1883, 'Beautiful Girls', (SELECT id FROM public.artists WHERE name = 'Sean Kingston'), 2, 2007, NULL),
  (1884, 'Kiss Kiss', (SELECT id FROM public.artists WHERE name = 'Chris Brown'), 4, 2007, NULL),
  (1885, 'No One', (SELECT id FROM public.artists WHERE name = 'Alicia Keys'), 2, 2007, NULL),
  (1886, 'Take a Bow', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2008, NULL),
  (1887, 'Viva la Vida', (SELECT id FROM public.artists WHERE name = 'Coldplay'), 2, 2008, NULL),
  (1888, 'So What', (SELECT id FROM public.artists WHERE name = 'Pink'), 2, 2008, NULL),
  (1889, 'Womanizer', (SELECT id FROM public.artists WHERE name = 'Britney Spears'), 2, 2008, NULL),
  (1890, 'My Life Would Suck Without You', (SELECT id FROM public.artists WHERE name = 'Kelly Clarkson'), 2, 2009, NULL),
  (1891, '3', (SELECT id FROM public.artists WHERE name = 'Britney Spears'), 2, 2009, NULL),
  (1892, 'Fireflies', (SELECT id FROM public.artists WHERE name = 'Owl City'), 2, 2009, NULL),
  (1893, 'Whatcha Say', (SELECT id FROM public.artists WHERE name = 'Jason Derulo'), 2, 2009, NULL),
  (1894, 'Empire State of Mind', (SELECT id FROM public.artists WHERE name = 'Jay-Z and Alicia Keys'), 2, 2009, NULL),
  (1895, 'Rude Boy', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2010, NULL),
  (1896, 'Nothin'' on You', 2413, 2, 2010, NULL),
  (1897, 'Love the Way You Lie', (SELECT id FROM public.artists WHERE name = 'Eminem featuring Rihanna'), 2, 2010, NULL),
  (1898, 'We R Who We R', (SELECT id FROM public.artists WHERE name = 'Kesha'), 2, 2010, NULL),
  (1899, 'What''s My Name?', (SELECT id FROM public.artists WHERE name = 'Rihanna featuring Drake'), 2, 2010, NULL),
  (1900, 'Only Girl (In the World)', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2010, NULL),
  (1901, 'Raise Your Glass', (SELECT id FROM public.artists WHERE name = 'Pink'), 2, 2010, NULL),
  (1902, 'Grenade', (SELECT id FROM public.artists WHERE name = 'Bruno Mars'), 2, 2011, NULL),
  (1903, 'Hold It Against Me', (SELECT id FROM public.artists WHERE name = 'Britney Spears'), 2, 2011, NULL),
  (1904, 'Black and Yellow', (SELECT id FROM public.artists WHERE name = 'Wiz Khalifa'), 3, 2011, NULL),
  (1905, 'Born This Way', (SELECT id FROM public.artists WHERE name = 'Lady Gaga'), 2, 2011, NULL),
  (1906, 'S&M', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2011, NULL),
  (1907, 'Sexy and I Know It', (SELECT id FROM public.artists WHERE name = 'LMFAO'), 7, 2012, NULL),
  (1908, 'Diamonds', (SELECT id FROM public.artists WHERE name = 'Rihanna'), 2, 2012, NULL),
  (1909, 'When I Was Your Man', (SELECT id FROM public.artists WHERE name = 'Bruno Mars'), 2, 2013, NULL),
  (1910, 'Just Give Me a Reason', (SELECT id FROM public.artists WHERE name = 'Pink'), 2, 2013, NULL),
  (1911, 'Cheerleader', (SELECT id FROM public.artists WHERE name = 'OMI'), 2, 2015, NULL),
  (1912, 'Love Yourself', (SELECT id FROM public.artists WHERE name = 'Justin Bieber'), 2, 2016, NULL),
  (1913, 'Pillowtalk', (SELECT id FROM public.artists WHERE name = 'ZAYN'), 2, 2016, NULL),
  (1914, 'I''m the One', (SELECT id FROM public.artists WHERE name = 'DJ Khaled'), 3, 2017, NULL),
  (1915, 'Sad!', (SELECT id FROM public.artists WHERE name = 'XXXTentacion'), 2, 2018, NULL),
  (1916, 'Without Me', (SELECT id FROM public.artists WHERE name = 'Halsey'), 2, 2019, NULL),
  (1917, 'Sucker', (SELECT id FROM public.artists WHERE name = 'Jonas Brothers'), 2, 2019, NULL),
  (1918, 'Señorita', 2414, 2, 2019, NULL),
  (1919, 'Highest in the Room', (SELECT id FROM public.artists WHERE name = 'Travis Scott'), 3, 2019, NULL),
  (1920, 'Lose You to Love Me', (SELECT id FROM public.artists WHERE name = 'Selena Gomez'), 2, 2019, NULL),
  (1921, 'Circles', (SELECT id FROM public.artists WHERE name = 'Post Malone'), 2, 2019, NULL),
  (1922, 'Heartless', (SELECT id FROM public.artists WHERE name = 'The Weeknd'), 2, 2019, NULL),
  (1923, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2019, NULL),
  (1924, 'Toosie Slide', (SELECT id FROM public.artists WHERE name = 'Drake'), 2, 2020, NULL),
  (1925, 'The Scotts', 2415, 2, 2020, NULL),
  (1926, 'Say So', (SELECT id FROM public.artists WHERE name = 'Doja Cat'), 2, 2020, NULL),
  (1927, 'Stuck with U', 2416, 2, 2020, NULL),
  (1928, 'Savage', 2417, 2, 2020, NULL),
  (1929, 'Rain on Me', 2418, 2, 2020, NULL),
  (1930, 'Trollz', 2419, 2, 2020, NULL),
  (1931, 'Watermelon Sugar', (SELECT id FROM public.artists WHERE name = 'Harry Styles'), 2, 2020, NULL),
  (1932, 'Franchise', (SELECT id FROM public.artists WHERE name = 'Travis Scott'), 3, 2020, NULL),
  (1933, 'Life Goes On', (SELECT id FROM public.artists WHERE name = 'BTS'), 2, 2020, NULL),
  (1934, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2020, NULL),
  (1935, 'Willow', (SELECT id FROM public.artists WHERE name = 'Taylor Swift'), 2, 2020, NULL),
  (1936, 'What''s Next', (SELECT id FROM public.artists WHERE name = 'Drake'), 2, 2021, NULL),
  (1937, 'Leave the Door Open', (SELECT id FROM public.artists WHERE name = 'Silk Sonic'), 2, 2021, NULL),
  (1938, 'Rapstar', 2420, 2, 2021, NULL),
  (1939, 'Save Your Tears', 2421, 2, 2021, NULL),
  (1940, 'My Universe', 2422, 2, 2021, NULL),
  (1941, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2021, NULL),
  (1942, 'Wait for U', (SELECT id FROM public.artists WHERE name = 'Future'), 2, 2022, NULL),
  (1943, 'Jimmy Cooks', (SELECT id FROM public.artists WHERE name = 'Drake'), 2, 2022, NULL),
  (1944, 'Super Freaky Girl', (SELECT id FROM public.artists WHERE name = 'Nicki Minaj'), 2, 2022, NULL),
  (1945, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2022, NULL),
  (1946, 'Die for You', 2421, 2, 2023, NULL),
  (1947, 'Seven', (SELECT id FROM public.artists WHERE name = 'Jung Kook featuring Latto'), 2, 2023, NULL),
  (1948, 'Try That in a Small Town', (SELECT id FROM public.artists WHERE name = 'Jason Aldean'), 2, 2023, NULL),
  (1949, 'Rich Men North of Richmond', 2423, 2, 2023, NULL),
  (1950, 'I Remember Everything', 2424, 2, 2023, NULL),
  (1951, 'Slime You Out', (SELECT id FROM public.artists WHERE name = 'Drake'), 2, 2023, NULL),
  (1952, 'First Person Shooter', (SELECT id FROM public.artists WHERE name = 'Drake'), 2, 2023, NULL),
  (1953, 'Rockin'' Around the Christmas Tree', (SELECT id FROM public.artists WHERE name = 'Brenda Lee'), 2, 2023, NULL),
  (1954, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2023, NULL),
  (1955, 'Hiss', 2425, 2, 2024, NULL),
  (1956, 'Carnival', 2426, 2, 2024, NULL),
  (1957, 'We Can''t Be Friends (Wait for Your Love)', (SELECT id FROM public.artists WHERE name = 'Ariana Grande'), 2, 2024, NULL),
  (1958, 'Lose Control', (SELECT id FROM public.artists WHERE name = 'Teddy Swims'), 2, 2024, NULL),
  (1959, 'Like That', 2427, 2, 2024, NULL),
  (1960, 'Too Sweet', (SELECT id FROM public.artists WHERE name = 'Hozier'), 2, 2024, NULL),
  (1961, 'I Had Some Help', (SELECT id FROM public.artists WHERE name = 'Post Malone'), 2, 2024, NULL),
  (1962, 'Love Somebody', (SELECT id FROM public.artists WHERE name = 'Morgan Wallen'), 2, 2024, NULL),
  (1963, 'Squabble Up', (SELECT id FROM public.artists WHERE name = 'Kendrick Lamar'), 3, 2024, NULL),
  (1964, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2024, NULL),
  (1965, '4x4', (SELECT id FROM public.artists WHERE name = 'Travis Scott'), 3, 2025, NULL),
  (1966, 'Not Like Us', (SELECT id FROM public.artists WHERE name = 'Kendrick Lamar'), 3, 2025, NULL),
  (1967, 'Luther', 2428, 2, 2025, NULL),
  (1968, 'What I Want', (SELECT id FROM public.artists WHERE name = 'Morgan Wallen'), 2, 2025, NULL),
  (1969, 'Ordinary', 2429, 2, 2025, NULL),
  (1970, 'Manchild', (SELECT id FROM public.artists WHERE name = 'Sabrina Carpenter'), 2, 2025, NULL),
  (1971, 'Golden', 2430, 2, 2025, NULL),
  (1972, 'The Fate of Ophelia', (SELECT id FROM public.artists WHERE name = 'Taylor Swift'), 2, 2025, NULL),
  (1973, 'All I Want for Christmas Is You', (SELECT id FROM public.artists WHERE name = 'Mariah Carey'), 2, 2025, NULL);

INSERT INTO public.chart_entries (id, song_id, position, chart_date, weeks_at_position) VALUES
  (1473, 1741, 1, DATE '1958-08-04', 2),
  (1474, 1742, 1, DATE '1958-08-18', 5),
  (1475, 1743, 1, DATE '1958-08-25', 1),
  (1476, 1744, 1, DATE '1958-09-29', 6),
  (1477, 1745, 1, DATE '1958-11-10', 2),
  (1478, 1746, 1, DATE '1958-11-17', 1),
  (1479, 1747, 1, DATE '1958-12-01', 3),
  (1480, 1748, 1, DATE '1958-12-22', 4),
  (1481, 1749, 1, DATE '1959-01-19', 3),
  (1482, 1750, 1, DATE '1959-02-09', 4),
  (1483, 1751, 1, DATE '1959-03-09', 5),
  (1484, 1752, 1, DATE '1959-04-13', 4),
  (1485, 1753, 1, DATE '1959-05-11', 1),
  (1486, 1754, 1, DATE '1959-05-18', 2),
  (1487, 1755, 1, DATE '1959-06-01', 6),
  (1488, 1756, 1, DATE '1959-07-13', 4),
  (1489, 1757, 1, DATE '1959-08-10', 2),
  (1490, 1758, 1, DATE '1959-08-24', 4),
  (1491, 1759, 1, DATE '1959-09-21', 2),
  (1492, 1760, 1, DATE '1959-10-05', 9),
  (1493, 1761, 1, DATE '1959-11-16', 1),
  (1494, 1762, 1, DATE '1959-12-14', 2),
  (1495, 1763, 1, DATE '1959-12-28', 1),
  (1496, 1764, 1, DATE '1962-01-13', 2),
  (1497, 1765, 1, DATE '1965-08-07', 1),
  (1498, 1766, 1, DATE '1965-12-25', 1),
  (1499, 1767, 1, DATE '1970-02-07', 1),
  (1500, 1768, 1, DATE '1970-02-14', 2),
  (1501, 1769, 1, DATE '1970-02-28', 6),
  (1502, 1770, 1, DATE '1970-04-11', 2),
  (1503, 1771, 1, DATE '1971-07-31', 1),
  (1504, 1772, 1, DATE '1971-12-25', 3),
  (1505, 1773, 1, DATE '1972-03-18', 1),
  (1506, 1774, 1, DATE '1972-09-23', 3),
  (1507, 1775, 1, DATE '1973-08-25', 2),
  (1508, 1776, 1, DATE '1973-10-27', 2),
  (1509, 1777, 1, DATE '1973-11-10', 2),
  (1510, 1778, 1, DATE '1974-01-19', 1),
  (1511, 1779, 1, DATE '1974-08-24', 3),
  (1512, 1780, 1, DATE '1974-09-21', 1),
  (1513, 1781, 1, DATE '1974-11-09', 1),
  (1514, 1782, 1, DATE '1974-12-21', 1),
  (1515, 1783, 1, DATE '1975-08-23', 1),
  (1516, 1784, 1, DATE '1977-10-01', 2),
  (1517, 1785, 1, DATE '1978-06-03', 1),
  (1518, 1786, 1, DATE '1980-01-05', 1),
  (1519, 1787, 1, DATE '1981-05-02', 2),
  (1520, 1788, 1, DATE '1982-11-06', 3),
  (1521, 1789, 1, DATE '1982-12-11', 1),
  (1522, 1790, 1, DATE '1983-09-10', 2),
  (1523, 1791, 1, DATE '1983-12-10', 6),
  (1524, 1792, 1, DATE '1985-03-09', 3),
  (1525, 1793, 1, DATE '1985-10-12', 1),
  (1526, 1794, 1, DATE '1985-11-09', 1),
  (1527, 1795, 1, DATE '1986-03-22', 1),
  (1528, 1796, 1, DATE '1986-05-10', 1),
  (1529, 1797, 1, DATE '1986-06-14', 3),
  (1530, 1798, 1, DATE '1986-09-06', 1),
  (1531, 1799, 1, DATE '1986-10-11', 2),
  (1532, 1800, 1, DATE '1986-12-06', 1),
  (1533, 1801, 1, DATE '1986-12-13', 1),
  (1534, 1802, 1, DATE '1987-06-06', 1),
  (1535, 1803, 1, DATE '1987-08-01', 1),
  (1536, 1804, 1, DATE '1987-11-07', 2),
  (1537, 1805, 1, DATE '1987-11-28', 1),
  (1538, 1806, 1, DATE '1987-12-05', 1),
  (1539, 1807, 1, DATE '1988-01-09', 1),
  (1540, 1808, 1, DATE '1988-01-16', 1),
  (1541, 1809, 1, DATE '1988-01-23', 1),
  (1542, 1810, 1, DATE '1988-02-06', 2),
  (1543, 1811, 1, DATE '1988-02-20', 1),
  (1544, 1812, 1, DATE '1988-09-10', 2),
  (1545, 1813, 1, DATE '1988-11-19', 2),
  (1546, 1814, 1, DATE '1988-12-03', 1),
  (1547, 1815, 1, DATE '1988-12-10', 2),
  (1548, 1816, 1, DATE '1989-02-04', 1),
  (1549, 1817, 1, DATE '1989-06-03', 1),
  (1550, 1818, 1, DATE '1989-06-17', 1),
  (1551, 1819, 1, DATE '1989-06-24', 1),
  (1552, 1820, 1, DATE '1989-07-01', 1),
  (1553, 1821, 1, DATE '1989-07-08', 1),
  (1554, 1822, 1, DATE '1989-07-15', 1),
  (1555, 1823, 1, DATE '1989-09-16', 1),
  (1556, 1824, 1, DATE '1989-11-11', 2),
  (1557, 1825, 1, DATE '1990-04-14', 1),
  (1558, 1826, 1, DATE '1990-06-16', 2),
  (1559, 1827, 1, DATE '1990-09-01', 1),
  (1560, 1828, 1, DATE '1990-09-08', 1),
  (1561, 1829, 1, DATE '1990-09-29', 1),
  (1562, 1830, 1, DATE '1990-10-06', 1),
  (1563, 1831, 1, DATE '1990-10-20', 1),
  (1564, 1832, 1, DATE '1990-12-08', 4),
  (1565, 1833, 1, DATE '1991-01-19', 1),
  (1566, 1834, 1, DATE '1991-02-23', 2),
  (1567, 1835, 1, DATE '1991-03-30', 2),
  (1568, 1836, 1, DATE '1991-04-13', 1),
  (1569, 1837, 1, DATE '1991-04-20', 1),
  (1570, 1838, 1, DATE '1991-05-11', 1),
  (1571, 1839, 1, DATE '1991-05-18', 1),
  (1572, 1840, 1, DATE '1991-05-25', 2),
  (1573, 1841, 1, DATE '1991-06-08', 1),
  (1574, 1842, 1, DATE '1991-09-14', 1),
  (1575, 1843, 1, DATE '1991-09-21', 2),
  (1576, 1844, 1, DATE '1991-10-05', 1),
  (1577, 1845, 1, DATE '1991-11-02', 1),
  (1578, 1846, 1, DATE '1992-06-20', 2),
  (1579, 1847, 1, DATE '1993-07-10', 2),
  (1580, 1848, 1, DATE '1995-04-15', 7),
  (1581, 1849, 1, DATE '1995-06-03', 5),
  (1582, 1850, 1, DATE '1997-10-04', 1),
  (1583, 1851, 1, DATE '1998-04-04', 3),
  (1584, 1852, 1, DATE '1998-05-23', 1),
  (1585, 1853, 1, DATE '1998-11-28', 1),
  (1586, 1854, 1, DATE '1998-12-05', 6),
  (1587, 1855, 1, DATE '1999-07-24', 1),
  (1588, 1856, 1, DATE '1999-09-04', 2),
  (1589, 1857, 1, DATE '2000-02-19', 1),
  (1590, 1858, 1, DATE '2000-06-24', 3),
  (1591, 1859, 1, DATE '2000-07-29', 2),
  (1592, 1860, 1, DATE '2000-08-12', 2),
  (1593, 1861, 1, DATE '2001-02-17', 1),
  (1594, 1862, 1, DATE '2002-02-23', 2),
  (1595, 1863, 1, DATE '2002-10-05', 2),
  (1596, 1864, 1, DATE '2003-02-08', 4),
  (1597, 1865, 1, DATE '2003-03-08', 9),
  (1598, 1866, 1, DATE '2003-05-31', 4),
  (1599, 1867, 1, DATE '2003-09-06', 4),
  (1600, 1868, 1, DATE '2003-10-04', 9),
  (1601, 1869, 1, DATE '2003-12-06', 1),
  (1602, 1870, 1, DATE '2004-02-14', 1),
  (1603, 1871, 1, DATE '2004-02-21', 1),
  (1604, 1872, 1, DATE '2005-07-02', 1),
  (1605, 1873, 1, DATE '2005-12-31', 2),
  (1606, 1874, 1, DATE '2006-01-14', 1),
  (1607, 1875, 1, DATE '2006-01-21', 2),
  (1608, 1876, 1, DATE '2006-03-11', 1),
  (1609, 1877, 1, DATE '2006-05-13', 3),
  (1610, 1878, 1, DATE '2006-07-01', 1),
  (1611, 1879, 1, DATE '2006-10-28', 2),
  (1612, 1880, 1, DATE '2006-12-02', 2),
  (1613, 1881, 1, DATE '2007-02-24', 1),
  (1614, 1882, 1, DATE '2007-05-26', 1),
  (1615, 1883, 1, DATE '2007-08-11', 4),
  (1616, 1884, 1, DATE '2007-11-10', 3),
  (1617, 1885, 1, DATE '2007-12-01', 5),
  (1618, 1886, 1, DATE '2008-05-24', 1),
  (1619, 1887, 1, DATE '2008-06-28', 1),
  (1620, 1888, 1, DATE '2008-09-27', 1),
  (1621, 1889, 1, DATE '2008-10-25', 1),
  (1622, 1890, 1, DATE '2009-02-07', 2),
  (1623, 1891, 1, DATE '2009-10-24', 1),
  (1624, 1892, 1, DATE '2009-11-07', 2),
  (1625, 1893, 1, DATE '2009-11-14', 1),
  (1626, 1894, 1, DATE '2009-11-28', 5),
  (1627, 1895, 1, DATE '2010-03-27', 5),
  (1628, 1896, 1, DATE '2010-05-01', 2),
  (1629, 1897, 1, DATE '2010-07-31', 7),
  (1630, 1898, 1, DATE '2010-11-13', 1),
  (1631, 1899, 1, DATE '2010-11-20', 1),
  (1632, 1900, 1, DATE '2010-12-04', 1),
  (1633, 1901, 1, DATE '2010-12-11', 1),
  (1634, 1902, 1, DATE '2011-01-08', 4),
  (1635, 1903, 1, DATE '2011-01-29', 1),
  (1636, 1904, 1, DATE '2011-02-19', 1),
  (1637, 1905, 1, DATE '2011-02-26', 6),
  (1638, 1906, 1, DATE '2011-04-30', 1),
  (1639, 1907, 1, DATE '2012-01-07', 2),
  (1640, 1908, 1, DATE '2012-12-01', 3),
  (1641, 1909, 1, DATE '2013-04-20', 1),
  (1642, 1910, 1, DATE '2013-04-27', 3),
  (1643, 1911, 1, DATE '2015-07-25', 6),
  (1644, 1912, 1, DATE '2016-02-13', 2),
  (1645, 1913, 1, DATE '2016-02-20', 1),
  (1646, 1914, 1, DATE '2017-05-20', 1),
  (1647, 1915, 1, DATE '2018-06-30', 1),
  (1648, 1916, 1, DATE '2019-01-12', 2),
  (1649, 1917, 1, DATE '2019-03-16', 1),
  (1650, 1918, 1, DATE '2019-08-31', 1),
  (1651, 1919, 1, DATE '2019-10-19', 1),
  (1652, 1920, 1, DATE '2019-11-09', 1),
  (1653, 1921, 1, DATE '2019-11-30', 3),
  (1654, 1922, 1, DATE '2019-12-14', 1),
  (1655, 1923, 1, DATE '2019-12-21', 3),
  (1656, 1924, 1, DATE '2020-04-18', 1),
  (1657, 1925, 1, DATE '2020-05-09', 1),
  (1658, 1926, 1, DATE '2020-05-16', 1),
  (1659, 1927, 1, DATE '2020-05-23', 1),
  (1660, 1928, 1, DATE '2020-05-30', 1),
  (1661, 1929, 1, DATE '2020-06-06', 1),
  (1662, 1930, 1, DATE '2020-06-27', 1),
  (1663, 1931, 1, DATE '2020-08-15', 1),
  (1664, 1932, 1, DATE '2020-10-10', 1),
  (1665, 1933, 1, DATE '2020-12-05', 1),
  (1666, 1934, 1, DATE '2020-12-19', 2),
  (1667, 1935, 1, DATE '2020-12-26', 1),
  (1668, 1936, 1, DATE '2021-03-20', 1),
  (1669, 1937, 1, DATE '2021-04-17', 2),
  (1670, 1938, 1, DATE '2021-04-24', 2),
  (1671, 1939, 1, DATE '2021-05-08', 2),
  (1672, 1940, 1, DATE '2021-10-09', 1),
  (1673, 1941, 1, DATE '2021-12-25', 3),
  (1674, 1942, 1, DATE '2022-05-14', 1),
  (1675, 1943, 1, DATE '2022-07-02', 1),
  (1676, 1944, 1, DATE '2022-08-27', 1),
  (1677, 1945, 1, DATE '2022-12-17', 4),
  (1678, 1946, 1, DATE '2023-03-11', 1),
  (1679, 1947, 1, DATE '2023-07-29', 1),
  (1680, 1948, 1, DATE '2023-08-05', 1),
  (1681, 1949, 1, DATE '2023-08-26', 2),
  (1682, 1950, 1, DATE '2023-09-09', 1),
  (1683, 1951, 1, DATE '2023-09-30', 1),
  (1684, 1952, 1, DATE '2023-10-21', 1),
  (1685, 1953, 1, DATE '2023-12-09', 3),
  (1686, 1954, 1, DATE '2023-12-23', 2),
  (1687, 1955, 1, DATE '2024-02-10', 1),
  (1688, 1956, 1, DATE '2024-03-16', 1),
  (1689, 1957, 1, DATE '2024-03-23', 1),
  (1690, 1958, 1, DATE '2024-03-30', 1),
  (1691, 1959, 1, DATE '2024-04-06', 3),
  (1692, 1960, 1, DATE '2024-04-27', 1),
  (1693, 1961, 1, DATE '2024-05-25', 6),
  (1694, 1962, 1, DATE '2024-11-02', 1),
  (1695, 1963, 1, DATE '2024-12-07', 1),
  (1696, 1964, 1, DATE '2024-12-14', 4),
  (1697, 1965, 1, DATE '2025-02-08', 1),
  (1698, 1966, 1, DATE '2025-02-22', 1),
  (1699, 1967, 1, DATE '2025-03-01', 13),
  (1700, 1968, 1, DATE '2025-05-31', 1),
  (1701, 1969, 1, DATE '2025-06-07', 10),
  (1702, 1970, 1, DATE '2025-06-21', 1),
  (1703, 1971, 1, DATE '2025-08-16', 8),
  (1704, 1972, 1, DATE '2025-10-18', 8),
  (1705, 1973, 1, DATE '2025-12-13', 3);

SELECT setval('public.songs_id_seq', (SELECT max(id) FROM public.songs), true);
SELECT setval('public.chart_entries_id_seq', (SELECT max(id) FROM public.chart_entries), true);
SELECT setval('public.artists_id_seq', (SELECT GREATEST(max(id), 2378) FROM public.artists), true);

COMMIT;
