import unittest
import requests
import urllib.parse


QUERY = open("./query.rq", "r").read()


def build_query(year: int) -> str:
    return QUERY.replace("|YEAR|", str(year), 1)


BASE_URL = "https://libris.kb.se/sparql"


def run_query(query: str):
    params = {
        "query": query,
        "format": "application/sparql-results+json",
    }

    resp = requests.get(f"{BASE_URL}?{urllib.parse.urlencode(params)}")
    print(f"Request took {resp.elapsed.total_seconds()} seconds!")
    resp.raise_for_status()

    return resp.json()


class TestQuery(unittest.TestCase):
    def test_returns_expected_titles_for_given_year(self):
        query_result = run_query(build_query(1956))

        rows = query_result["results"]["bindings"]
        self.assertEqual(3539, len(rows))
        self.assertTrue(
            any(
                (
                    x["title"]["value"] == "En eld är havet"
                    and x["givenName"]["value"] == "Rut"
                    and x["familyName"]["value"] == "Hillarp"
                )
                for x in rows
            )
        )


if __name__ == "__main__":
    unittest.main()
