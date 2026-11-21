-- New cover for the lateral flow article: Labb urine cups and oral fluid tests with the phone reader.
update articles set cover_url = '/img/news/rapid-drug-test-kits-with-phone-reader.webp',
  image_alt = 'Labb urine drug test cups and oral fluid drug tests with the Labb app reader on a phone', updated_at = now()
where slug = 'how-lateral-flow-rapid-drug-tests-work' and cover_type is null;
