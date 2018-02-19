# T-3

Live example at https://t3.danruta.co.uk

## Training the AI

Once the MongoDB is running, navigate to `/trainer` and run `node --max-old-space-size=30000 node-trainer.js -i 20000`

--max-old-space-size defines the allocated RAM, and -i is the number of epochs to train the network for. The higher, the better, but more memory is used up, before the values are dumped into the database. In a future release, maybe training will be able to stream directly to the database.

You can change the epsilon hyperparameter with the -e flag (default is 0.5).

You can use the -t flag to set trainer mode:

y = Yes, do the training
n = No, do not train, just use the existing database data
d = Do not train, and also delete all database data

You can play the game from the command-line here, for sanity checking.


## Developing

Clone the repo and `npm install` the dependencies.

Ensure you have MongoDB installed and running then run `npm run devstart` to start a development server.

Run `grunt` in another window in order to compile the javascript files.
