#!/usr/bin/python
import csv
import urllib.request
import urllib.parse
import json

def main():
    GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyA0bVqYq3Nos7TGw63fNmZP5SpaQylR_Zk&address='
    with open('top1351.csv', 'r') as csvfile, open('out.csv', 'w') as outfile:
        reader = csv.DictReader(csvfile, delimiter=';')

        fieldnames = reader.fieldnames[:]
        writer = csv.DictWriter(outfile, delimiter='\t', quotechar='"', fieldnames=fieldnames, lineterminator='\n')
        writer.writeheader()

        for row in reader:
            url = urllib.parse.quote(GOOGLE_API_BASE + row['location'], safe="%/:=&?~#+!$,;'@()*[]")

            with urllib.request.urlopen(url) as response:
                data = json.loads(response.read().decode('utf-8'))
                if data['status'] == 'OK' and len(data['results']) > 0:
                    latlng = data['results'][0]['geometry']['location']
                    resultLatlng = str(latlng['lat']) + ',' + str(latlng['lng'])

                    row['latlng'] = resultLatlng
                    writer.writerow(row)


if __name__ == '__main__':
    main()