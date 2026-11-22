INSERT INTO vocabulary_entries (id,word,translation,example,cefr,definition,collocation,topic,source,licence) VALUES
('studio-book','book','книга','I read a book on the bus.','A1','книга','','General English','IELTS Studio','original'),
('studio-family','family','семья','My family lives near the park.','A1','семья','','General English','IELTS Studio','original'),
('studio-water','water','вода','Can I have some water, please?','A1','вода','','General English','IELTS Studio','original'),
('studio-school','school','школа','We walk to school every morning.','A1','школа','','General English','IELTS Studio','original'),
('studio-window','window','окно','Please open the window.','A1','окно','','General English','IELTS Studio','original'),
('studio-borrow','borrow','брать взаймы','Can I borrow your pen until lunch?','A2','брать взаймы','','General English','IELTS Studio','original'),
('studio-journey','journey','поездка','The train journey took two hours.','A2','поездка','','General English','IELTS Studio','original'),
('studio-neighbour','neighbour','сосед','Our neighbour looks after our cat.','A2','сосед','','General English','IELTS Studio','original'),
('studio-ticket','ticket','билет','Keep your ticket until you leave the train.','A2','билет','','General English','IELTS Studio','original'),
('studio-crowded','crowded','многолюдный','The market is crowded on Saturdays.','A2','многолюдный','','General English','IELTS Studio','original'),
('studio-improve','improve','улучшать','Students can improve their writing by revising a first draft.','B1','улучшать','','General English','IELTS Studio','original'),
('studio-advantage','advantage','преимущество','One advantage of cycling is its low cost.','B1','преимущество','','General English','IELTS Studio','original'),
('studio-reduce','reduce','сокращать','The school hopes to reduce food waste.','B1','сокращать','','General English','IELTS Studio','original'),
('studio-afford','afford','позволить себе','Many students cannot afford a flat near campus.','B1','позволить себе','','General English','IELTS Studio','original'),
('studio-behaviour','behaviour','поведение','The researchers observed the behaviour of birds.','B1','поведение','','General English','IELTS Studio','original'),
('studio-evidence','evidence','доказательства','The survey provides evidence of a change in travel habits.','B2','доказательства','','General English','IELTS Studio','original'),
('studio-decline','decline','снижение','The graph shows a gradual decline in sales.','B2','снижение','','General English','IELTS Studio','original'),
('studio-outcome','outcome','результат','Access to books can affect the outcome of a course.','B2','результат','','General English','IELTS Studio','original'),
('studio-estimate','estimate','приблизительно оценивать','It is difficult to estimate the cost of repairs.','B2','приблизительно оценивать','','General English','IELTS Studio','original'),
('studio-undergo','undergo','подвергаться','The samples undergo several tests.','B2','подвергаться','','General English','IELTS Studio','original'),
('studio-allocate','allocate','распределять','The council must allocate funds across three districts.','C1','распределять','','General English','IELTS Studio','original'),
('studio-constraint','constraint','ограничение','Time was the main constraint on the study.','C1','ограничение','','General English','IELTS Studio','original'),
('studio-disparity','disparity','неравенство','The figures reveal a disparity in access to healthcare.','C1','неравенство','','General English','IELTS Studio','original'),
('studio-implicit','implicit','подразумеваемый','The argument rests on an implicit assumption about demand.','C1','подразумеваемый','','General English','IELTS Studio','original'),
('studio-plausible','plausible','правдоподобный','The author offers a plausible explanation for the decline.','C1','правдоподобный','','General English','IELTS Studio','original'),
('studio-equivocal','equivocal','неоднозначный','The findings remain equivocal despite the larger sample.','C2','неоднозначный','','General English','IELTS Studio','original'),
('studio-corroborate','corroborate','подкреплять доказательствами','Independent records corroborate the witness account.','C2','подкреплять доказательствами','','General English','IELTS Studio','original'),
('studio-tenuous','tenuous','слабо обоснованный','The link between the two trends is tenuous.','C2','слабо обоснованный','','General English','IELTS Studio','original'),
('studio-circumscribe','circumscribe','ограничивать рамками','Budget rules circumscribe the choices open to local councils.','C2','ограничивать рамками','','General English','IELTS Studio','original'),
('studio-pervasive','pervasive','повсеместный','The report describes the pervasive influence of advertising.','C2','повсеместный','','General English','IELTS Studio','original');
--> statement-breakpoint
CREATE VIEW material_levels AS
SELECT m.id AS material_id, COALESCE(e.cefr, CASE
  WHEN m.slug='comparing-figures' THEN 'A2'
  WHEN m.slug IN ('a-cooler-station','a-place-to-concentrate') THEN 'B1'
  WHEN e.difficulty='foundation' THEN 'A2'
  WHEN e.difficulty='advanced' THEN 'C1'
  ELSE 'B2' END) AS cefr
FROM materials m LEFT JOIN material_editions e ON e.material_id=m.id;
