TSC=tsc
TSCFLAGS=--pretty --lib ES2015,dom --module commonjs --alwaysStrict --noEmitOnError

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')

all: fts.html

fts.html: .build-wiki $(JS_FILES) $(TID_FILES) plugin.info
	mkdir -p .build-wiki/plugins/full-text-search
	cp *.js .build-wiki/plugins/full-text-search
	cp *.tid .build-wiki/plugins/full-text-search
	cp *.info .build-wiki/plugins/full-text-search
	cp -R files/ .build-wiki/plugins/full-text-search
	tiddlywiki .build-wiki --output $(shell pwd) --rendertiddler '$$:/core/save/all' $@ text/plain

.build-wiki:
	tiddlywiki .build-wiki --init empty
	jq '(.plugins) |= . + ["hoelzro/progress-bar", "hoelzro/full-text-search"]' .build-wiki/tiddlywiki.info > .build-wiki/tiddlywiki.info.tmp
	mv .build-wiki/tiddlywiki.info.tmp .build-wiki/tiddlywiki.info
	mkdir .build-wiki/plugins/
	git clone https://github.com/hoelzro/tw-progress-bar .build-wiki/plugins/progress-bar

clean:
	rm -f $(JS_FILES) fts.html

realclean: clean
	rm -rf .build-wiki/

%.js: %.ts
	$(TSC) $(TSCFLAGS) $^
