-- New cover for the package inserts article: UA:23A cup, its procedure card and the Labb app.
update articles set cover_url = '/img/news/urine-drug-test-cup-procedure-card-and-labb-app.webp',
  image_alt = 'Labb UA:23A urine drug test cup with its procedure card and the Labb app on a phone', updated_at = now()
where slug = 'reading-drug-test-package-inserts-cutoffs' and cover_type is null;
