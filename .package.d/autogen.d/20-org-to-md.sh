# -*- mode: shell-script -*-

depends org-ruby

##
## This conversion is done so that `npm publish` can display
## the content of the `README.org` correctly. Note that github
## supports `.org`. Notice that the API http page relies also
## on this.
##
org-ruby --translate markdown README.org > README.md
rm README.org

cat CHANGELOG.md >> README.md
rm CHANGELOG.md