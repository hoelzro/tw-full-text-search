# Purpose

Provides an alternative search result list that orders results by search relevance and ignores differences in word forms (ex. *tag* vs *tags*).

On my personal wiki, I have the problem that there are terms I use across a lot of tiddlers, and sometimes I'll use different forms (such as the aforementioned *tag* vs *tags*).  I wanted a plugin to allow me to find the tiddler I'm looking for quickly and didn't require me to worry about how I declined a noun or inflected a verb - so I wrote this plugin, which provides an alternative search list powered by [lunr.js](https://lunrjs.com/).

This plugin should be considered as **BETA** quality - I use it pretty much every day, but there's definitely room for improvement.  Please [let me know](https://github.com/hoelzro/tw-full-text-search/issues) if there are any bugs!

! Demo

https://hoelz.ro/files/fts.html

! Installation

https://hoelz.ro/files/fts.html

! Usage

Each time you start a new TiddlyWiki session, you'll need to build the FTS index.  You can do this from a tab in the `$:/ControlPanel`.  Older versions of the index are retained in web storage, so it should be pretty quick after the first time!  After you build the index, you can just search as you would normally.

! Ideas for Future Enhancement

  * Display score for serach results
  * Specify a filter for tiddlers to be included in the index.
  * Custom stemmers for non-English/mixed language wikis
  * Automatically index in the background upon startup

! Source Code

If you want to help out, you can check out the source for this plugin (or its dependency, the progress bar plugin) on GitHub:

https://github.com/hoelzro/tw-full-text-search/

https://github.com/hoelzro/tw-progress-bar

Requires [$:/plugins/hoelzro/progress-bar](https://github.com/hoelzro/tw-progress-bar) to display progress when generating the index.
