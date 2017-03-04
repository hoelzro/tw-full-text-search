Full-text search plugin.  Provides functionality like
stemming and stop word removal, provided by lunr.js.

In order to make use of full-text search, you need to
build the index.  There's a tab in the control panel
with a button to do this; the index will last over
the course of your whole session.

Requires [$:/hoelzro/progressbar](https://github.com/hoelzro/tw-progress-bar)
to display progress when generating the index.

# Ideas for Future Enhancement

  * Specify a filter for tiddlers to be included in the index.
  * Custom stemmers for non-English/mixed language wikis
