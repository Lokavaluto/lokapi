# -*- mode: shell-script -*-

if get_path gitchangelog >/dev/null; then
    gitchangelog > CHANGELOG.md
    if [ "$?" != 0 ]; then
        echo "Changelog NOT generated. An error occured while running \`\`gitchangelog\`\`." >&2
    else
        echo "Changelog generated."
    fi
else
    echo "Changelog NOT generated because \`\`gitchangelog\`\` could not be found."
    touch CHANGELOG.md  ## create it anyway because it's required by setup.py current install
fi
