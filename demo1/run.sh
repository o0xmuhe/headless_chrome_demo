#!/bin/bash




if [ "$#" -ne 1 ]; then
    echo "Illegal number of parameters"
    exit 2
fi



node preview.js $1

echo "enjoy your preview page"

echo "open res.png with imagemagick"

display res.png
