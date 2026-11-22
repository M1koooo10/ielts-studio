INSERT INTO materials(id,slug,skill,title,description,body,instructions,minutes,status) VALUES
  (1,'a-cooler-station','reading','A Cooler Station','Короткий научно-популярный текст о городском транспорте.','At North Quay station, engineers tested two ways of cooling the platform in summer. They put a white coating on the roof above the western half and left the eastern half unchanged. Sensors on both halves recorded the air temperature every fifteen minutes.

After six weeks, the average afternoon temperature beneath the coated roof was two degrees lower than under the old surface. At night, the difference disappeared. Passenger surveys also reported greater comfort on the western half, although the researchers warned that the new benches there might have influenced the responses.

The team has recommended a second trial at a station without new seating. Before deciding whether to coat every roof, the transport authority wants to know how often the coating needs cleaning.','Read the passage. For questions 1–2 choose TRUE, FALSE or NOT GIVEN. For question 3 write NO MORE THAN TWO WORDS from the passage.',8,'ready'),
  (2,'shared-gardens','writing','The Future of Shared Gardens','Тема для эссе IELTS Academic Writing Task 2.','In some cities, residents are turning unused land into shared gardens. Some people believe this land should be used for housing instead.

Discuss both views and give your own opinion.','Give reasons for your answer and include relevant examples from your own knowledge or experience. Write at least 250 words.',40,'ready'),
  (3,'a-place-to-concentrate','speaking','A Place to Concentrate','Карточка Speaking Part 2 о месте, где легко сосредоточиться.','Describe a place where you find it easy to concentrate.

You should say where it is, what it looks like, and what you usually do there. Explain why it helps you concentrate.','You have one minute to prepare. Speak for one to two minutes.',3,'ready'),
  (4,'comparing-figures','grammar','Comparing Figures','Сравнительные конструкции для описания данных в Writing Task 1.','Use “than” after a comparative adjective: The northern route is shorter than the southern route. Use “as … as” when the values are equal: Both routes are ten kilometres long; the northern route is as long as the southern route.','Choose the phrase that completes the sentence.',5,'ready');
--> statement-breakpoint
INSERT INTO questions(id,material_id,position,kind,prompt,options,max_words) VALUES
  (1,1,1,'true_false_not_given','The sensors collected readings every quarter of an hour.','["TRUE","FALSE","NOT GIVEN"]',NULL),
  (2,1,2,'true_false_not_given','The coating lowered the night-time temperature on the western half.','["TRUE","FALSE","NOT GIVEN"]',NULL),
  (3,1,3,'short_answer','According to the researchers, what might have affected the survey responses?','[]',2),
  (4,4,1,'multiple_choice','The two districts recorded identical totals. Demand in the east was ___ demand in the west.','["higher than","as high as","highest of"]',NULL);
--> statement-breakpoint
INSERT INTO answer_keys(question_id,accepted,explanation,evidence) VALUES
  (1,'["TRUE"]','A quarter of an hour is fifteen minutes.','Sensors on both halves recorded the air temperature every fifteen minutes.'),
  (2,'["FALSE"]','The difference was measured in the afternoon and disappeared at night.','At night, the difference disappeared.'),
  (3,'["new benches","benches"]','The seating changed on the same half as the roof surface.','the new benches there might have influenced the responses'),
  (4,'["as high as"]','Use as + adjective + as to compare two equal values.','The two districts recorded identical totals.');
