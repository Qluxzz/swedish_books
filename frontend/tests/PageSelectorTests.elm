module PageSelectorTests exposing (..)

import Expect
import Fuzz
import PageSelector
import Set
import Test exposing (..)


deduplicateList : List comparable -> List comparable
deduplicateList =
    Set.fromList >> Set.toList


suite : Test
suite =
    describe "PageSelector"
        [ fuzz2 (Fuzz.intRange 1 50) (Fuzz.intRange 1 50) "Range generation never generates duplicated items" <|
            \totalPages currentPage ->
                let
                    actual =
                        PageSelector.pagebuttons currentPage totalPages

                    expected =
                        deduplicateList actual
                in
                Expect.equalLists expected actual
        , test "Range generation when only one pages does not have duplicated items" <|
            \_ ->
                let
                    actual =
                        PageSelector.pagebuttons 1 1

                    expected =
                        deduplicateList actual
                in
                Expect.equalLists actual expected
        ]
