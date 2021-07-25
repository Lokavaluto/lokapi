# -*- mode: shell-script -*-

depends org-ruby

##
## This conversion is done so that `npm publish` can display
## the content of the `README.org` correctly. Note that github
## supports `.org`. And the API http page will support its own
## convertion in ``.github/workflows/publish-doc`
##
org-ruby --translate markdown README.org > README.md
rm README.org

cat CHANGELOG.md >> README.md
rm CHANGELOG.md