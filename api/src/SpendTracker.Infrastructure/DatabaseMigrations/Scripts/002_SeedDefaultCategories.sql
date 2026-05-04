-- 002_SeedDefaultCategories.sql
-- Seed common default spending categories

INSERT OR IGNORE INTO Categories (Name, Description, CreatedDate) VALUES
    ('Groceries',           'Food, groceries, and supermarket shopping',                datetime('now')),
    ('Fuel & Petrol',       'Petrol, diesel, and vehicle fuel costs',                   datetime('now')),
    ('Dining & Restaurants','Eating out, takeaways, and cafes',                         datetime('now')),
    ('Entertainment',       'Movies, events, concerts, and leisure activities',          datetime('now')),
    ('Rent & Housing',      'Rent payments and accommodation costs',                    datetime('now')),
    ('Utilities',           'Electricity, water, and municipal services',               datetime('now')),
    ('Medical & Health',    'Doctor visits, pharmacy, and medical expenses',            datetime('now')),
    ('Insurance',           'Car, home, life, and other insurance premiums',            datetime('now')),
    ('Clothing & Apparel',  'Clothing, shoes, and accessories',                         datetime('now')),
    ('Transport',           'Uber, taxi, public transport, and tolls',                  datetime('now')),
    ('Education',           'School fees, courses, and educational materials',          datetime('now')),
    ('Travel & Holidays',   'Flights, hotels, and holiday expenses',                    datetime('now')),
    ('Subscriptions',       'Streaming, software, and recurring subscriptions',         datetime('now')),
    ('Personal Care',       'Haircuts, beauty, and personal hygiene products',          datetime('now')),
    ('Sport & Fitness',     'Gym membership, sports equipment, and activities',         datetime('now')),
    ('Home Maintenance',    'Repairs, furniture, and household items',                  datetime('now')),
    ('Banking Fees',        'Bank charges, transaction fees, and interest',             datetime('now')),
    ('Gifts & Donations',   'Presents, donations, and charitable contributions',        datetime('now')),
    ('Savings',             'Transfers to savings accounts and investments',             datetime('now')),
    ('Miscellaneous',       'Other expenses that do not fit a specific category',       datetime('now'));
